import { prisma } from "@/lib/prisma";
import { mockPaymentProvider } from "@/lib/payment/provider";
import { buildNotificationMessage, notificationHref } from "@/lib/notification-types";

/**
 * PAID 포스트 단건 구매 서비스 (SPEC-009 FR-003~FR-005, NFR-001~NFR-003, AC-002/004/007/008/010/011).
 *
 * SPEC-006(contracts.ts)의 ServiceResult 판별 유니온 + 단일 트랜잭션 패턴을 재사용한다.
 * 구매는 Payment(PAID)/Settlement(PENDING)/Notification을 원자적으로 생성한다(NFR-002).
 */

const FEE_RATE = 0.1; // 플랫폼 수수료 10% (NFR-003, SPEC-006 일관)

export type PurchaseServiceContext = {
  userId: string;
};

export type PurchaseServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 401 | 404 | 409 | 500; error: string };

type PostForPurchase = {
  id: string;
  creatorProfileId: string;
  visibility: string;
  priceKrw: number | null;
  creatorProfile: { userId: string } | null;
};

/**
 * PAID 포스트 단건 구매 (FR-003, FR-004, FR-005).
 *
 * MockPaymentProvider.charge()를 호출하고 단일 트랜잭션으로
 * Payment(PAID)/Settlement(PENDING)/Notification(PAYMENT_COMPLETED)을 생성한다.
 * priceKrw가 없거나 양수가 아니면 400, 이미 구매했으면 409, 트랜잭션 실패 시 500.
 */
export async function purchasePost(
  ctx: PurchaseServiceContext,
  postId: string,
): Promise<PurchaseServiceResult<{ paymentId: string; settlementId: string; amount: number; feeKrw: number }>> {
  const post = (await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      creatorProfileId: true,
      visibility: true,
      priceKrw: true,
      creatorProfile: { select: { userId: true } },
    },
  })) as PostForPurchase | null;

  if (!post) {
    return { ok: false, status: 404, error: "Post not found" };
  }

  // 작성자 본인 구매 금지 — 작성자는 무료로 열람 가능하므로 결제 레코드가 불필요 (AC-005).
  if (post.creatorProfile?.userId === ctx.userId) {
    return { ok: false, status: 400, error: "Cannot purchase your own post" };
  }

  // 단건 구매는 PAID 포스트만 대상 (FR-004 전제)
  if (post.visibility !== "PAID") {
    return { ok: false, status: 400, error: "Post is not a PAID post" };
  }

  // PAID 포스트는 항상 양수 가격 (FR-004, AC-008)
  if (post.priceKrw == null || post.priceKrw <= 0) {
    return { ok: false, status: 400, error: "PAID post must have a positive price" };
  }

  // 중복 구매 차단 (FR-005, AC-004) — 애플리케이션 레벨 PAID 상태 체크
  const existing = await prisma.payment.findFirst({
    where: { postId, fanUserId: ctx.userId, status: { in: ["PAID", "RELEASED"] } },
  });
  if (existing) {
    return { ok: false, status: 409, error: "Post already purchased" };
  }

  const amount = post.priceKrw;
  const feeKrw = Math.round(amount * FEE_RATE);
  const payout = amount - feeKrw;

  // 실제 PG가 아닌 Mock — 외부 의존성 없이 항상 성공 (FR-010, NFR-001, AC-010)
  const charge = await mockPaymentProvider.charge({ postId, amount });
  if (!charge.success) {
    return { ok: false, status: 500, error: "Payment charge failed" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: { postId, fanUserId: ctx.userId, amount, feeKrw, status: "PAID" },
      });
      const settlement = await tx.settlement.create({
        data: { paymentId: payment.id, payout, status: "PENDING" },
      });
      await tx.notification.create({
        data: {
          userId: ctx.userId,
          type: "PAYMENT_COMPLETED",
          message: buildNotificationMessage("PAYMENT_COMPLETED", {}),
          linkUrl: notificationHref("PAYMENT_COMPLETED", { postId }),
        },
      });
      return { paymentId: payment.id, settlementId: settlement.id };
    });

    return { ok: true, data: { ...result, amount, feeKrw } };
  } catch (err) {
    // 동시 구매 경합으로 unique 제약(P2002) 위반 시 409로 매핑 (FR-005).
    if (isUniqueViolation(err)) {
      return { ok: false, status: 409, error: "Post already purchased" };
    }
    return { ok: false, status: 500, error: "Purchase transaction failed" };
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}
