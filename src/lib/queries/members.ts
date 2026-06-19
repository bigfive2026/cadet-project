import { prisma } from "@/lib/prisma";

/**
 * 멤버/참여자 명단 조회 쿼리 (SPEC-007 FR-008, FR-009, FR-011).
 */

/**
 * 크리에이터 스튜디오의 활성 멤버 목록 (FR-008, AC-006).
 * Membership.plan.creatorProfileId로 소속 판정하고 user/plan을 단일 쿼리로 포함한다 (NFR-002 N+1 회피).
 */
export function listActiveMembers(creatorProfileId: string) {
  return prisma.membership.findMany({
    where: { plan: { creatorProfileId } },
    include: {
      user: { select: { id: true, name: true } },
      plan: { select: { id: true, title: true } },
    },
    orderBy: { startedAt: "desc" },
  });
}

/**
 * 프로그램 참여자 목록 (FR-009, AC-007).
 * ACCEPTED 신청자를 user/contract.payments와 함께 조회한다.
 * 호출자는 contract.payments로 결제 완료 여부(some status in [PAID, RELEASED])를 파생한다.
 */
export function listProgramParticipants(programId: string) {
  return prisma.programApplication.findMany({
    where: { programId, status: "ACCEPTED" },
    include: {
      user: { select: { id: true, name: true } },
      contract: {
        include: { payments: { select: { status: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * 팬 본인의 멤버십 목록 (FR-011, AC-008).
 * plan.creatorProfile(크리에이터명)을 포함하여 최신순으로 조회한다.
 */
export function listMyMemberships(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: {
      plan: {
        include: {
          creatorProfile: { select: { id: true, studioName: true } },
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });
}
