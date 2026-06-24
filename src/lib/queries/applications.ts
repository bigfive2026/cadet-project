import { prisma } from "@/lib/prisma";

/**
 * 신청 조회(read) 쿼리 (SPEC-005 FR-002, AC-002).
 */

/**
 * 크리에이터를 위한 프로그램 신청 목록 (FR-002).
 * 최신순 정렬, 신청자 정보 포함.
 */
export function listApplicationsForCreator(programId: string) {
  return prisma.programApplication.findMany({
    where: { programId },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * 활성 신청 조회 (FR-002, AC-002).
 * 레거시 PENDING과 선착순 RESERVED/PENDING_PAYMENT/ACCEPTED 상태를 활성으로 간주한다.
 * 중복 신청/이미 신청 판정용으로 사용된다.
 */
export function findActiveApplication(programId: string, userId: string) {
  return prisma.programApplication.findFirst({
    where: {
      programId,
      userId,
      status: { in: ["PENDING", "RESERVED", "PENDING_PAYMENT", "ACCEPTED"] },
    },
    include: {
      payment: { select: { amount: true, status: true } },
    },
  });
}

/**
 * 팬 본인의 전체 신청 목록 (팬 홈 대시보드용).
 * PENDING/ACCEPTED/REJECTED/AUTO_REJECTED/CANCELLED 상태별 집계와
 * 최근 신청 미리보기를 위해 사용된다. 최신 업데이트순 정렬.
 */
export function listMyApplications(userId: string) {
  return prisma.programApplication.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      program: {
        select: {
          id: true,
          title: true,
          priceKrw: true,
          status: true,
          // 완료 후 리뷰 작성 여부 판별용(본인 작성 리뷰만).
          reviews: { where: { userId }, select: { id: true }, take: 1 },
        },
      },
      // 선착순 프로그램 결제 상태 계산용.
      payment: { select: { status: true, createdAt: true, updatedAt: true } },
    },
  });
}
