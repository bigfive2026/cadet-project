import { prisma } from "@/lib/prisma";
import { findActiveApplication } from "@/lib/queries/applications";
import { buildNotificationMessage, notificationHref } from "@/lib/notification-types";

/**
 * 프로그램 신청 서비스 (SPEC-005 FR-001~FR-009, FR-012, AC-001~AC-012).
 *
 * ServiceContext와 ServiceResult 판별 유니온을 재사용한다.
 * 트랜잭션을 사용하여 신청 상태 변경과 알림 생성의 원자성을 보장한다.
 */

export type ApplicationServiceContext = {
  role: string;
  creatorProfileId: string | null | undefined;
};

export type ApplicationServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404 | 409 | 500; error: string };

function ensureCreator(
  ctx: ApplicationServiceContext,
): ApplicationServiceResult<string> {
  if (ctx.role !== "CREATOR" || !ctx.creatorProfileId) {
    return { ok: false, status: 403, error: "Forbidden: CREATOR role required" };
  }
  return { ok: true, data: ctx.creatorProfileId };
}

/**
 * 프로그램 참여 신청 (FR-001~FR-004, AC-001~AC-004).
 *
 * - CREATOR 역할도 팬으로 참여 가능 (FR-004)
 * - 단, 자기 프로그램을 CREATOR 역할로 신청할 수 없다 (FR-004)
 * - RECRUITING 상태이고 모집 기한 내에만 신청 가능 (FR-003)
 * - 이미 활성(PENDING/ACCEPTED) 신청이 있으면 409 (FR-002)
 */
export async function applyToProgram(
  ctx: ApplicationServiceContext,
  programId: string,
  userId: string,
  message?: string,
): Promise<ApplicationServiceResult<{ id: string }>> {
  // 프로그램 로드
  const program = await prisma.program.findUnique({
    where: { id: programId },
  });
  if (!program || program.deletedAt) {
    return { ok: false, status: 404, error: "Program not found" };
  }

  // CREATOR 역할은 자기 프로그램에 FAN 역할로만 신청 가능 (FR-004)
  if (ctx.role === "CREATOR" && program.creatorProfileId === ctx.creatorProfileId) {
    return { ok: false, status: 400, error: "Cannot apply to own program as CREATOR role" };
  }

  // RECRUITING 상태 확인 (FR-003)
  if (program.status !== "RECRUITING") {
    return { ok: false, status: 400, error: "Program is not recruiting" };
  }

  // 모집 기한 확인 (FR-003)
  if (program.recruitDeadline && program.recruitDeadline < new Date()) {
    return { ok: false, status: 400, error: "Application deadline has passed" };
  }

  // 중복 신청 확인 (FR-002)
  const existing = await findActiveApplication(programId, userId);
  if (existing) {
    return { ok: false, status: 409, error: "Already applied" };
  }

  // 신청 생성 + 크리에이터 알림
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { id: program.creatorProfileId },
    select: { userId: true },
  });
  if (!creatorProfile) {
    return { ok: false, status: 404, error: "Creator profile not found" };
  }

  // 신청 생성 + 크리에이터 알림을 단일 트랜잭션으로 원자화 (AC-001).
  // 둘 중 하나라도 실패하면 롤백되어 고아(신청만 남고 알림 누락) 상태를 방지한다.
  try {
    const application = await prisma.$transaction(async (tx) => {
      const created = await tx.programApplication.create({
        data: {
          programId,
          userId,
          status: "PENDING",
          message,
        },
      });

      // 크리에이터에게 알림 생성 (AC-004)
      await tx.notification.create({
        data: {
          userId: creatorProfile.userId,
          type: "APPLICATION_CREATED",
          message: buildNotificationMessage("APPLICATION_CREATED", {}),
          linkUrl: notificationHref("APPLICATION_CREATED", { programId }),
        },
      });

      return created;
    });

    return { ok: true, data: { id: application.id } };
  } catch {
    return { ok: false, status: 500, error: "Application creation failed" };
  }
}

/**
 * 신청 처리 - 수락/거절 (FR-007~FR-009, AC-010~AC-012).
 *
 * 단일 트랜잭션 내에서:
 * - 신청 상태 변경
 * - autoRejectOthers true면 다른 PENDING 자동 거절 (FR-007)
 * - 관련 알림 생성
 *
 * 알림 생성 실패 시 전체 롤백 (AC-012).
 */
export async function processApplication(
  ctx: ApplicationServiceContext,
  applicationId: string,
  action: "accept" | "reject",
  autoRejectOthers = false,
): Promise<
  ApplicationServiceResult<{
    application: { id: string; status: string };
    autoRejectedCount: number;
  }>
> {
  const guard = ensureCreator(ctx);
  if (!guard.ok) return guard;

  // 신청 로드 (프로그램 포함)
  const application = await prisma.programApplication.findUnique({
    where: { id: applicationId },
    include: { program: true },
  });
  if (!application) {
    return { ok: false, status: 404, error: "Application not found" };
  }

  // 소유권 확인 (FR-008, AC-005)
  if (application.program.creatorProfileId !== guard.data) {
    return { ok: false, status: 403, error: "Forbidden: not the program owner" };
  }

  // PENDING 상태 확인 (FR-009, AC-010)
  if (application.status !== "PENDING") {
    return { ok: false, status: 400, error: "Application is not PENDING" };
  }

  // 트랜잭션 내에서 상태 변경 + 알림 생성.
  // 알림/상태 변경 중 하나라도 실패하면 트랜잭션이 전체 롤백된다(AC-012).
  // 서비스는 트랜잭션 예외를 ServiceResult(ok:false)로 변환하여 반환한다.
  try {
    const result = await prisma.$transaction(async (tx) => {
    let autoRejectedCount = 0;

    if (action === "accept") {
      // 대상 신청 수락
      const updated = await tx.programApplication.update({
        where: { id: applicationId },
        data: { status: "ACCEPTED" },
      });

      // autoRejectOthers true면 다른 PENDING 자동 거절 (FR-007)
      if (autoRejectOthers) {
        const rejectResult = await tx.programApplication.updateMany({
          where: {
            programId: application.programId,
            id: { not: applicationId },
            status: "PENDING",
          },
          data: { status: "AUTO_REJECTED" },
        });
        autoRejectedCount = rejectResult.count;

        // 자동 거절된 신청자들에게 알림 (AC-011)
        if (autoRejectedCount > 0) {
          const autoRejected = await tx.programApplication.findMany({
            where: {
              programId: application.programId,
              status: "AUTO_REJECTED",
            },
            select: { userId: true },
          });
          await tx.notification.createMany({
            data: autoRejected.map((a) => ({
              userId: a.userId,
              type: "APPLICATION_AUTO_REJECTED",
              message: buildNotificationMessage("APPLICATION_AUTO_REJECTED", {}),
              linkUrl: notificationHref("APPLICATION_AUTO_REJECTED", {
                programId: application.programId,
              }),
            })),
          });
        }
      }

      // 신청자에게 수락 알림
      await tx.notification.create({
        data: {
          userId: application.userId,
          type: "APPLICATION_ACCEPTED",
          message: buildNotificationMessage("APPLICATION_ACCEPTED", {}),
          linkUrl: notificationHref("APPLICATION_ACCEPTED", {
            programId: application.programId,
          }),
        },
      });

      return { application: updated, autoRejectedCount };
    } else {
      // 거절
      const updated = await tx.programApplication.update({
        where: { id: applicationId },
        data: { status: "REJECTED" },
      });

      // 신청자에게 거절 알림
      await tx.notification.create({
        data: {
          userId: application.userId,
          type: "APPLICATION_REJECTED",
          message: buildNotificationMessage("APPLICATION_REJECTED", {}),
          linkUrl: notificationHref("APPLICATION_REJECTED", {
            programId: application.programId,
          }),
        },
      });

      return { application: updated, autoRejectedCount: 0 };
    }
    });

    return { ok: true, data: result };
  } catch {
    return { ok: false, status: 500, error: "Application processing failed" };
  }
}

/**
 * 프로그램 마감 알림 (FR-010, AC-006).
 *
 * 모든 PENDING 신청자에게 PROGRAM_CLOSED 알림을 생성한다.
 */
export async function notifyProgramClosed(programId: string): Promise<void> {
  const pendingApplications = await prisma.programApplication.findMany({
    where: {
      programId,
      status: "PENDING",
    },
    select: { userId: true },
  });

  if (pendingApplications.length === 0) return;

  await prisma.notification.createMany({
    data: pendingApplications.map((a) => ({
      userId: a.userId,
      type: "PROGRAM_CLOSED",
      message: buildNotificationMessage("PROGRAM_CLOSED", {}),
      linkUrl: notificationHref("PROGRAM_CLOSED", { programId }),
    })),
  });
}
