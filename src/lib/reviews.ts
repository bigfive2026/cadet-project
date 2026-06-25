import { prisma } from "@/lib/prisma";
import {
  buildNotificationMessage,
  notificationHref,
} from "@/lib/notification-types";
import type { ReviewInput } from "@/lib/validation/review";

/**
 * 에스크로 완료(납품 요청·완료 승인) 및 상호 평가 서비스
 * (SPEC-008 골격 + SPEC-013 에스크로 순서·양방향 평가).
 *
 * - 납품 요청(requestDelivery): 크리에이터(소유자)가 결제 완료 참여에 대해.
 * - 완료 승인(approveCompletion): 팬(지불자)이 납품 요청 후. Payment/Settlement RELEASED.
 *   모든 결제 완료 참여가 승인되면 Program COMPLETED.
 * - completeProgram: 크리에이터 보조 — 일괄 납품 요청(SPEC-008 라우트 호환).
 * - createReview: 양방향(팬→크리에이터, 크리에이터→팬), revieweeId 도출/입력.
 *
 * ServiceResult 판별 유니온 패턴(SPEC-006) 재사용. 완료 승인은 단일 트랜잭션 원자성 보장(NFR-001).
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

// ────────────── SPEC-013: 납품 요청 (크리에이터 → 팬) ──────────────

/**
 * 납품 요청 (SPEC-013 FR-001~FR-005).
 *
 * 크리에이터(소유자)가 IN_PROGRESS 프로그램의 결제 완료(PAID) 참여에 대해
 * deliveryRequestedAt을 세팅하고 팬에게 DELIVERY_REQUESTED 알림.
 */
export async function requestDelivery(
  ctx: ReviewServiceContext,
  applicationId: string,
): Promise<ReviewServiceResult<{ deliveryRequestedAt: Date; notifiedFan: boolean }>> {
  const application = await prisma.programApplication.findUnique({
    where: { id: applicationId },
    include: { program: { select: { id: true, status: true, creatorProfileId: true } } },
  });
  if (!application || !application.program) {
    return { ok: false, status: 404, error: "Application not found" };
  }

  // 권한: 프로그램 소유 크리에이터 (FR-003, AC-002)
  if (ctx.role !== "CREATOR" || ctx.creatorProfileId !== application.program.creatorProfileId) {
    return { ok: false, status: 403, error: "Forbidden: not the program owner" };
  }

  // 상태: IN_PROGRESS만 (FR-004, AC-003)
  if (application.program.status !== "IN_PROGRESS") {
    return { ok: false, status: 400, error: "Program is not IN_PROGRESS" };
  }

  // 순서 무결성: 이미 완료 승인된 신청은 "진행(납품 요청)" 단계로 되돌릴 수 없다.
  // 완료(completionApprovedAt)보다 늦은 deliveryRequestedAt 이 기록되어 타임라인이
  // 역전되는 것을 소스에서 차단한다.
  if (application.completionApprovedAt) {
    return { ok: false, status: 400, error: "Already completed; cannot request delivery" };
  }

  // 결제 완료(PAID) 참여만 (FR-004, AC-003)
  const paid = await prisma.payment.findFirst({
    where: {
      contract: { applicationId },
      status: "PAID",
    },
    select: { id: true },
  });
  if (!paid) {
    return { ok: false, status: 400, error: "No paid payment for this participation" };
  }

  // 멱등: 이미 요청됐으면 중복 알림 없이 기존 시각 반환 (FR-005)
  if (application.deliveryRequestedAt) {
    return { ok: true, data: { deliveryRequestedAt: application.deliveryRequestedAt, notifiedFan: false } };
  }

  const deliveryRequestedAt = new Date();
  await prisma.$transaction([
    prisma.programApplication.update({
      where: { id: applicationId },
      data: { deliveryRequestedAt },
    }),
    prisma.notification.create({
      data: {
        userId: application.userId,
        type: "DELIVERY_REQUESTED",
        message: buildNotificationMessage("DELIVERY_REQUESTED", {}),
        linkUrl: notificationHref("DELIVERY_REQUESTED", { programId: application.program.id }),
      },
    }),
  ]);

  return { ok: true, data: { deliveryRequestedAt, notifiedFan: true } };
}

// ────────────── SPEC-013: 완료 승인 (팬 = 지불자) ──────────────

type EscrowParticipation = {
  id: string;
  programId: string;
  userId: string;
  deliveryRequestedAt: Date | null;
  completionApprovedAt: Date | null;
};

/**
 * 완료 승인 (SPEC-013 FR-006~FR-011, NFR-001~NFR-003, AC-004~AC-008).
 *
 * 팬(지불자)이 납품 요청된 본인 참여를 승인. 단일 트랜잭션으로:
 *  - 해당 Payment.status = RELEASED, Settlement.status = RELEASED, completionApprovedAt 세팅
 *  - 크리에이터에게 COMPLETION_APPROVED, 양측에게 MUTUAL_REVIEW_REQUESTED 알림
 *  - 모든 결제 완료 참여가 승인되면 Program COMPLETED (FR-010)
 * 납품 요청 없으면 400(에스크로 순서 강제, FR-007). 지불자 외 403(FR-008).
 */
export async function approveCompletion(
  ctx: ReviewServiceContext,
  applicationId: string,
): Promise<
  ReviewServiceResult<{
    completionApprovedAt: Date;
    programStatus: string;
    releasedPayment: boolean;
    releasedSettlement: boolean;
    mutualReviewRequested: boolean;
  }>
> {
  const application = (await prisma.programApplication.findUnique({
    where: { id: applicationId },
    include: { program: { select: { id: true, status: true, creatorProfileId: true } } },
  })) as EscrowParticipation & {
    program: { id: string; status: string; creatorProfileId: string };
  } | null;
  if (!application || !application.program) {
    return { ok: false, status: 404, error: "Application not found" };
  }

  // 권한: 해당 참여의 지불자(팬)만 (FR-008, AC-006)
  if (ctx.userId !== application.userId) {
    return { ok: false, status: 403, error: "Forbidden: only the paying fan can approve completion" };
  }

  // 에스크로 순서: 납품 요청 선행 (FR-007, AC-004)
  if (!application.deliveryRequestedAt) {
    return { ok: false, status: 400, error: "Delivery must be requested before completion approval" };
  }

  // 멱등: 이미 승인됨
  if (application.completionApprovedAt) {
    return {
      ok: true,
      data: {
        completionApprovedAt: application.completionApprovedAt,
        programStatus: application.program.status,
        releasedPayment: true,
        releasedSettlement: true,
        mutualReviewRequested: false,
      },
    };
  }

  const completionApprovedAt = new Date();
  const programId = application.program.id;
  const fanUserId = application.userId;
  const creatorProfileId = application.program.creatorProfileId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 해당 참여의 결제(계약 결제) RELEASED (FR-006)
      const payment = await tx.payment.findFirst({
        where: { contract: { applicationId }, status: "PAID" },
        select: { id: true },
      });
      let releasedPayment = false;
      let releasedSettlement = false;
      if (payment) {
        // Settlement는 Payment와 1:0..1. 계약 결제에는 항상 존재해야 한다.
        // @MX:ANCHOR: Settlement 누락 시 트랜잭션 롤백 — 부분 커밋/정산 불일치 방지 (AC-007)
        // @MX:REASON: Payment=RELEASED만 커밋되고 Settlement=PENDING이 남으면 정산 불일치가 발생한다.
        const settle = await tx.settlement.findUnique({
          where: { paymentId: payment.id },
          select: { id: true },
        });
        if (!settle) {
          throw new Error(`Settlement missing for payment ${payment.id}`);
        }
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "RELEASED" },
        });
        await tx.settlement.update({
          where: { paymentId: payment.id },
          data: { status: "RELEASED" },
        });
        releasedPayment = true;
        releasedSettlement = true;
      }

      await tx.programApplication.update({
        where: { id: applicationId },
        data: { completionApprovedAt },
      });

      // FR-010: 모든 결제 완료 참여가 승인되었는지 확인
      const paidParticipations = await tx.programApplication.findMany({
        where: {
          programId,
          contract: { payments: { some: { status: { in: ["PAID", "RELEASED"] } } } },
        },
        select: { id: true, completionApprovedAt: true },
      });
      let programStatus = application.program.status;
      if (
        paidParticipations.length > 0 &&
        paidParticipations.every((p) => p.completionApprovedAt)
      ) {
        await tx.program.update({
          where: { id: programId },
          data: { status: "COMPLETED" },
        });
        programStatus = "COMPLETED";
      }

      // 알림: 크리에이터에게 COMPLETION_APPROVED (FR-009)
      const owner = await tx.creatorProfile.findUnique({
        where: { id: creatorProfileId },
        select: { userId: true },
      });
      if (owner) {
        await tx.notification.create({
          data: {
            userId: owner.userId,
            type: "COMPLETION_APPROVED",
            message: buildNotificationMessage("COMPLETION_APPROVED", {}),
            linkUrl: notificationHref("COMPLETION_APPROVED", { programId }),
          },
        });
      }

      // 상호 평가 요청 알림 — 팬·크리에이터 양측 (FR-009)
      const reviewRecipients = new Set<string>([fanUserId]);
      if (owner) reviewRecipients.add(owner.userId);
      await tx.notification.createMany({
        data: Array.from(reviewRecipients).map((userId) => ({
          userId,
          type: "MUTUAL_REVIEW_REQUESTED",
          message: buildNotificationMessage("MUTUAL_REVIEW_REQUESTED", {}),
          linkUrl: notificationHref("MUTUAL_REVIEW_REQUESTED", { programId }),
        })),
      });

      return { completionApprovedAt, programStatus, releasedPayment, releasedSettlement };
    });

    return { ok: true, data: { ...result, mutualReviewRequested: true } };
  } catch {
    return { ok: false, status: 500, error: "Completion approval transaction failed" };
  }
}

/**
 * 크리에이터 일괄 납품 요청 (SPEC-008 라우트 호환 보조).
 *
 * 크리에이터 본인이 IN_PROGRESS 프로그램에서 호출 시, 결제 완료(PAID)이면서
 * 아직 납품 요청되지 않은 모든 참여에 일괄 납품 요청을 수행한다.
 * (SPEC-008의 프로그램 일괄 COMPLETED 대신 SPEC-013 에스크로 흐름으로 재정의 —
 * 완료 승인은 팬이 참여 단위로 수행하므로 여기서는 COMPLETED로 전환하지 않는다.)
 */
export async function completeProgram(
  ctx: ReviewServiceContext,
  programId: string,
): Promise<
  ReviewServiceResult<{
    programStatus: string;
    requestedDeliveries: number;
    notifiedParticipants: number;
  }>
> {
  const program = await loadProgram(programId);
  if (!program || program.deletedAt) {
    return { ok: false, status: 404, error: "Program not found" };
  }

  if (ctx.role !== "CREATOR" || ctx.creatorProfileId !== program.creatorProfileId) {
    return { ok: false, status: 403, error: "Forbidden: not the program owner" };
  }

  if (program.status !== "IN_PROGRESS") {
    return { ok: false, status: 400, error: "Program is not IN_PROGRESS" };
  }

  const pending = await prisma.programApplication.findMany({
    where: {
      programId,
      deliveryRequestedAt: null,
      contract: { payments: { some: { status: "PAID" } } },
    },
    select: { id: true, userId: true },
  });

  const now = new Date();
  let notifiedParticipants = 0;
  if (pending.length > 0) {
    await prisma.$transaction([
      prisma.programApplication.updateMany({
        where: { id: { in: pending.map((p) => p.id) } },
        data: { deliveryRequestedAt: now },
      }),
      prisma.notification.createMany({
        data: pending.map((p) => ({
          userId: p.userId,
          type: "DELIVERY_REQUESTED" as const,
          message: buildNotificationMessage("DELIVERY_REQUESTED", {}),
          linkUrl: notificationHref("DELIVERY_REQUESTED", { programId }),
        })),
      }),
    ]);
    notifiedParticipants = new Set(pending.map((p) => p.userId)).size;
  }

  return {
    ok: true,
    data: {
      programStatus: program.status,
      requestedDeliveries: pending.length,
      notifiedParticipants,
    },
  };
}

// ────────────── SPEC-013: 상호 평가 (양방향 리뷰) ──────────────

/**
 * 리뷰 작성 — 양방향 (SPEC-008 FR-005~FR-010 + SPEC-013 FR-012~FR-018).
 *
 * 작성자 역할로 피평가자를 결정:
 *  - 팬(작성자): revieweeId 미전달 시 프로그램 소유 크리에이터의 User.id로 자동 세팅 (FR-012).
 *  - 크리에이터(작성자=소유자): revieweeId(평가할 팬) 필수 (FR-013). 해당 팬은 이 프로그램의
 *    완료 승인된 참여자여야 한다 (FR-017).
 *
 * 자격: 완료 승인(completionApprovedAt != null)된 참여. 완료 전이면 400, 비참여자면 403 (FR-016).
 * 중복: @@unique([programId, userId, revieweeId])로 1회 강제 (FR-014).
 */
export async function createReview(
  ctx: ReviewServiceContext,
  programId: string,
  input: ReviewInput & { revieweeId?: string },
): Promise<ReviewServiceResult<{ id: string; rating: number; comment: string | null; tags: string[] }>> {
  const program = await loadProgram(programId);
  if (!program || program.deletedAt) {
    return { ok: false, status: 404, error: "Program not found" };
  }

  // 크리에이터 소유자의 User.id 조회 (피평가자/권한 판정용)
  const owner = await prisma.creatorProfile.findUnique({
    where: { id: program.creatorProfileId },
    select: { userId: true },
  });
  if (!owner) {
    return { ok: false, status: 404, error: "Program owner not found" };
  }
  const creatorUserId = owner.userId;

  const isOwnerCreator =
    ctx.role === "CREATOR" && ctx.creatorProfileId === program.creatorProfileId;

  // 피평가자 결정 + 권한/자격 검증 (FR-012, FR-013, FR-016, FR-017)
  let revieweeId: string;
  if (isOwnerCreator) {
    // 크리에이터 → 팬 평가. revieweeId(팬) 필수.
    if (!input.revieweeId) {
      return { ok: false, status: 400, error: "revieweeId is required for creator reviews" };
    }
    revieweeId = input.revieweeId;
    if (revieweeId === ctx.userId) {
      return { ok: false, status: 400, error: "Cannot review yourself" };
    }
    // 대상 팬이 이 프로그램의 완료 승인된 참여자인지 (FR-017)
    const targetPart = await prisma.programApplication.findFirst({
      where: {
        programId,
        userId: revieweeId,
        completionApprovedAt: { not: null },
      },
      select: { id: true },
    });
    if (!targetPart) {
      return { ok: false, status: 403, error: "Forbidden: target is not a completed participant" };
    }
  } else {
    // 팬 → 크리에이터 평가. revieweeId는 크리에이터 User.id로 고정 (FR-012).
    revieweeId = creatorUserId;
    // 본인이 이 프로그램의 완료 승인된 참여자인지 (FR-016)
    const ownPart = await prisma.programApplication.findFirst({
      where: {
        programId,
        userId: ctx.userId,
        completionApprovedAt: { not: null },
      },
      select: { id: true },
    });
    if (!ownPart) {
      return { ok: false, status: 403, error: "Forbidden: not a completed participant" };
    }
  }

  // 중복 사전 체크 (FR-014). DB 제약이 최종 방어선 (NFR-004).
  const existing = await prisma.review.findFirst({
    where: { programId, userId: ctx.userId, revieweeId },
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
        revieweeId,
        rating: input.rating,
        comment: input.comment,
        tags: input.tags,
      },
      select: { id: true, rating: true, comment: true, tags: true },
    });
    return { ok: true, data: review };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, status: 409, error: "Review already exists" };
    }
    return { ok: false, status: 500, error: "Review creation failed" };
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}
