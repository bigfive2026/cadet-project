import { prisma } from "@/lib/prisma";
import {
  buildNotificationMessage,
  notificationHref,
} from "@/lib/notification-types";
import type { ReviewInput } from "@/lib/validation/review";

/**
 * 프로그램 완료 처리 및 리뷰 서비스 (SPEC-008 FR-001~FR-010, AC-001~AC-013).
 *
 * SPEC-006의 ServiceResult 판별 유니온 패턴을 재사용한다.
 * 완료 승인은 단일 트랜잭션으로 Program/Payment/Settlement/Notification의 원자성을 보장한다(NFR-001).
 */

export type ReviewServiceContext = {
  userId: string;
  role: string;
  creatorProfileId: string | null | undefined;
};

export type ReviewServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404 | 409 | 500; error: string };

type ProgramOwner = {
  id: string;
  status: string;
  creatorProfileId: string;
  deletedAt: Date | null;
};

async function loadProgram(id: string): Promise<ProgramOwner | null> {
  return prisma.program.findUnique({
    where: { id },
    select: { id: true, status: true, creatorProfileId: true, deletedAt: true },
  });
}

/**
 * 완료 승인 (FR-001~FR-004, NFR-001, AC-001~AC-004).
 *
 * 크리에이터 본인이 IN_PROGRESS 프로그램에서 호출 시 단일 트랜잭션으로:
 * - Program.status = COMPLETED
 * - ACCEPTED + 결제 완료(PAID) 신청자의 Payment.status = RELEASED
 * - 해당 Payment의 Settlement.status = RELEASED
 * - 각 참여자에게 REVIEW_REQUESTED 알림
 * 어느 한 단계라도 실패하면 전체 롤백되고 500을 반환한다 (AC-004).
 */
export async function completeProgram(
  ctx: ReviewServiceContext,
  programId: string,
): Promise<
  ReviewServiceResult<{
    programStatus: string;
    releasedPayments: number;
    releasedSettlements: number;
    notifiedParticipants: number;
  }>
> {
  const program = await loadProgram(programId);
  if (!program || program.deletedAt) {
    return { ok: false, status: 404, error: "Program not found" };
  }

  // 권한: 크리에이터 본인만 (FR-003, AC-002)
  if (ctx.role !== "CREATOR" || ctx.creatorProfileId !== program.creatorProfileId) {
    return { ok: false, status: 403, error: "Forbidden: not the program owner" };
  }

  // 상태 전이: IN_PROGRESS → COMPLETED 만 허용 (FR-004, AC-003)
  if (program.status !== "IN_PROGRESS") {
    return { ok: false, status: 400, error: "Program is not IN_PROGRESS" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.program.update({
        where: { id: programId },
        data: { status: "COMPLETED" },
      });

      // ACCEPTED 신청 + 결제 완료(PAID)인 참여자의 결제 (FR-001)
      const payments = await tx.payment.findMany({
        where: {
          status: "PAID",
          contract: {
            application: { programId, status: "ACCEPTED" },
          },
        },
        select: { id: true, fanUserId: true },
      });

      let releasedSettlements = 0;
      const notifiedFans = new Set<string>();
      for (const payment of payments) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "RELEASED" },
        });
        const settlement = await tx.settlement.update({
          where: { paymentId: payment.id },
          data: { status: "RELEASED" },
        }).catch(() => null);
        if (settlement) releasedSettlements += 1;

        // REVIEW_REQUESTED 알림 — fan당 1회 (FR-002, AC-001)
        if (!notifiedFans.has(payment.fanUserId)) {
          notifiedFans.add(payment.fanUserId);
          await tx.notification.create({
            data: {
              userId: payment.fanUserId,
              type: "REVIEW_REQUESTED",
              message: buildNotificationMessage("REVIEW_REQUESTED", {}),
              linkUrl: notificationHref("REVIEW_REQUESTED", { programId }),
            },
          });
        }
      }

      return {
        programStatus: "COMPLETED",
        releasedPayments: payments.length,
        releasedSettlements,
        notifiedParticipants: notifiedFans.size,
      };
    });

    return { ok: true, data: result };
  } catch {
    return { ok: false, status: 500, error: "Complete transaction failed" };
  }
}

/**
 * 리뷰 작성 (FR-005~FR-010, NFR-003, AC-005~AC-009).
 *
 * 권한 참여자(ACCEPTED + 결제 완료)가 COMPLETED 프로그램에 리뷰를 1회 작성한다.
 * 중복은 사전 쿼리 + DB unique 제약(@@unique([programId, userId])) 이중으로 차단한다 (NFR-003).
 */
export async function createReview(
  ctx: ReviewServiceContext,
  programId: string,
  input: ReviewInput,
): Promise<ReviewServiceResult<{ id: string; rating: number; comment: string | null }>> {
  const program = await loadProgram(programId);
  if (!program || program.deletedAt) {
    return { ok: false, status: 404, error: "Program not found" };
  }

  // COMPLETED 후에만 리뷰 작성 가능 (FR-008, AC-008)
  if (program.status !== "COMPLETED") {
    return { ok: false, status: 400, error: "Program is not COMPLETED" };
  }

  // 자격: ACCEPTED + 결제 완료(PAID|RELEASED) 참여자 (FR-009, AC-009)
  const qualifying = await prisma.payment.findFirst({
    where: {
      fanUserId: ctx.userId,
      status: { in: ["PAID", "RELEASED"] },
      contract: { application: { programId, status: "ACCEPTED" } },
    },
    select: { id: true },
  });
  if (!qualifying) {
    return { ok: false, status: 403, error: "Forbidden: not a paid participant" };
  }

  // 중복 사전 체크 (FR-006, AC-006). DB 제약이 최종 방어선 (NFR-003).
  const existing = await prisma.review.findFirst({
    where: { programId, userId: ctx.userId },
    select: { id: true },
  });
  if (existing) {
    return { ok: false, status: 409, error: "Review already exists" };
  }

  try {
    const review = await prisma.review.create({
      data: {
        programId,
        userId: ctx.userId,
        rating: input.rating,
        comment: input.comment,
      },
      select: { id: true, rating: true, comment: true },
    });
    return { ok: true, data: review };
  } catch (err) {
    // 경합으로 인한 unique 위반(P2002)도 409로 매핑 (NFR-003)
    if (isUniqueViolation(err)) {
      return { ok: false, status: 409, error: "Review already exists" };
    }
    return { ok: false, status: 500, error: "Review creation failed" };
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}
