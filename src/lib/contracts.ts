import { prisma } from "@/lib/prisma";
import { mockPaymentProvider } from "@/lib/payment/provider";
import { buildNotificationMessage, notificationHref } from "@/lib/notification-types";

/**
 * 계약(약관) 및 Mock 결제 서비스 (SPEC-006 FR-001~FR-012, AC-001~AC-010).
 *
 * SPEC-005의 ServiceResult 판별 유니온 패턴을 재사용한다.
 * 결제는 단일 트랜잭션으로 Payment/Settlement/Program 상태/알림의 원자성을 보장한다(NFR-001).
 */

const FEE_RATE = 0.1; // 플랫폼 수수료 10% (NFR-003)

export type ContractServiceContext = {
  userId: string;
  role: string;
  creatorProfileId: string | null | undefined;
};

export type ContractServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404 | 409 | 500; error: string };

/** 약관 본문 — 데모용 고정 텍스트. terms Json 스냅샷에 포함된다. */
export const AGREEMENT_TEXT =
  "본 계약은 ArtBridge 데모를 위한 약관입니다. 팬은 프로그램 참여 대금을 결제하며, 플랫폼은 완료 승인 시까지 대금을 보관(에스크로)합니다. 플랫폼 수수료는 10%입니다.";

type ApplicationWithProgram = {
  id: string;
  userId: string;
  status: string;
  program: { id: string; title: string; priceKrw: number; creatorProfileId: string };
};

/** 계약 접근 권한 판정: 팬 본인 또는 크리에이터 소유자 (FR-011, FR-012). */
function resolveAccess(
  ctx: ContractServiceContext,
  fanUserId: string,
  creatorProfileId: string,
): "fan" | "creator" | null {
  if (ctx.userId === fanUserId) return "fan";
  if (ctx.role === "CREATOR" && ctx.creatorProfileId === creatorProfileId) return "creator";
  return null;
}

/**
 * 계약 생성/조회 (FR-001, FR-002, FR-011, AC-001).
 *
 * ACCEPTED 신청에 대해 계약이 없으면 생성(terms Json에 programTitle/priceKrw/약관 스냅샷),
 * 있으면 기존 레코드를 반환한다(멱등). 팬 본인 또는 크리에이터 소유자만 접근 가능.
 */
export async function getOrCreateContract(
  ctx: ContractServiceContext,
  applicationId: string,
): Promise<ContractServiceResult<{ id: string }>> {
  const application = (await prisma.programApplication.findUnique({
    where: { id: applicationId },
    include: { program: true, contract: true },
  })) as (ApplicationWithProgram & { contract: { id: string } | null }) | null;

  if (!application) {
    return { ok: false, status: 404, error: "Application not found" };
  }

  const access = resolveAccess(ctx, application.userId, application.program.creatorProfileId);
  if (!access) {
    return { ok: false, status: 403, error: "Forbidden: not the contract participant" };
  }

  // 이미 계약이 있으면 재생성하지 않는다 (FR-002)
  if (application.contract) {
    return { ok: true, data: { id: application.contract.id } };
  }

  // ACCEPTED 신청만 계약 생성 대상 (FR-001)
  if (application.status !== "ACCEPTED") {
    return { ok: false, status: 400, error: "Application is not ACCEPTED" };
  }

  const created = await prisma.contract.create({
    data: {
      applicationId,
      agreedAmount: application.program.priceKrw,
      terms: {
        programTitle: application.program.title,
        priceKrw: application.program.priceKrw,
        agreement: AGREEMENT_TEXT,
      },
    },
  });

  return { ok: true, data: { id: created.id } };
}

type ContractWithApplication = {
  id: string;
  agreedAmount: number;
  fanSignedAt: Date | null;
  application: {
    userId: string;
    program: { id: string; priceKrw: number; creatorProfileId: string };
  };
};

async function loadContract(id: string): Promise<ContractWithApplication | null> {
  return (await prisma.contract.findUnique({
    where: { id },
    include: { application: { include: { program: true } } },
  })) as ContractWithApplication | null;
}

/**
 * 계약 서명 (FR-003, FR-004, FR-011, FR-012, AC-002, AC-003).
 *
 * 팬 본인이 동의(agreed=true)하면 fanSignedAt을 현재 시각으로 설정한다.
 * 동의하지 않았으면 400, 본인이 아니거나 크리에이터면 403.
 */
export async function signContract(
  ctx: ContractServiceContext,
  contractId: string,
  agreed: boolean,
): Promise<ContractServiceResult<{ fanSignedAt: Date }>> {
  const contract = await loadContract(contractId);
  if (!contract) {
    return { ok: false, status: 404, error: "Contract not found" };
  }

  const access = resolveAccess(
    ctx,
    contract.application.userId,
    contract.application.program.creatorProfileId,
  );
  // 서명은 팬 본인만 가능 (크리에이터는 읽기 전용 — FR-012)
  if (access !== "fan") {
    return { ok: false, status: 403, error: "Forbidden: only the fan can sign" };
  }

  // 동의 체크박스 미선택 시 거부 (FR-004, AC-002)
  if (!agreed) {
    return { ok: false, status: 400, error: "Agreement is required to sign" };
  }

  const fanSignedAt = new Date();
  await prisma.contract.update({
    where: { id: contractId },
    data: { fanSignedAt },
  });

  return { ok: true, data: { fanSignedAt } };
}

/**
 * Mock 결제 시작 (FR-005, FR-007, FR-008, FR-010, NFR-001, NFR-003, AC-004, AC-005, AC-009).
 *
 * 서명 완료(fanSignedAt != null)된 계약에 대해 MockPaymentProvider.charge()를 호출하고,
 * 단일 트랜잭션으로 Payment(PAID)/Settlement(PENDING)/Program(IN_PROGRESS)/Notification을 생성한다.
 * 어느 한 단계라도 실패하면 전체 롤백되고 500을 반환한다(AC-009).
 */
export async function startPayment(
  ctx: ContractServiceContext,
  contractId: string,
): Promise<
  ContractServiceResult<{ paymentId: string; settlementId: string; programStatus: string }>
> {
  const contract = await loadContract(contractId);
  if (!contract) {
    return { ok: false, status: 404, error: "Contract not found" };
  }

  // 결제는 팬 본인만 가능 (FR-011, AC-006)
  if (ctx.userId !== contract.application.userId) {
    return { ok: false, status: 403, error: "Forbidden: only the fan can pay" };
  }

  // 서명 선행 (FR-005)
  if (!contract.fanSignedAt) {
    return { ok: false, status: 400, error: "Contract must be signed before payment" };
  }

  // 중복 결제 차단 (FR-008, AC-005)
  const existing = await prisma.payment.findFirst({
    where: { contractId, status: { in: ["PAID", "RELEASED"] } },
  });
  if (existing) {
    return { ok: false, status: 409, error: "Contract already paid" };
  }

  const amount = contract.agreedAmount || contract.application.program.priceKrw;
  const feeKrw = Math.round(amount * FEE_RATE);
  const payout = amount - feeKrw;
  const fanUserId = contract.application.userId;
  const programId = contract.application.program.id;

  // 실제 PG가 아닌 Mock — 외부 의존성 없이 항상 성공 (FR-009, NFR-002, AC-008)
  const charge = await mockPaymentProvider.charge({ contractId, amount });
  if (!charge.success) {
    return { ok: false, status: 500, error: "Payment charge failed" };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: { contractId, fanUserId, amount, feeKrw, status: "PAID" },
      });
      const settlement = await tx.settlement.create({
        data: { paymentId: payment.id, payout, status: "PENDING" },
      });
      const program = await tx.program.update({
        where: { id: programId },
        data: { status: "IN_PROGRESS" },
      });
      await tx.notification.create({
        data: {
          userId: fanUserId,
          type: "PAYMENT_COMPLETED",
          message: buildNotificationMessage("PAYMENT_COMPLETED", {}),
          linkUrl: notificationHref("PAYMENT_COMPLETED", { contractId }),
        },
      });
      return {
        paymentId: payment.id,
        settlementId: settlement.id,
        programStatus: program.status,
      };
    });

    return { ok: true, data: result };
  } catch (err) {
    // 동시 결제 경합으로 payments.contract_id unique 제약(P2002) 위반 시,
    // findFirst 선검사와 동일하게 409로 매핑한다 (FR-008, AC-005).
    if (isUniqueViolation(err)) {
      return { ok: false, status: 409, error: "Contract already paid" };
    }
    return { ok: false, status: 500, error: "Payment transaction failed" };
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}
