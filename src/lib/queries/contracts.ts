import { prisma } from "@/lib/prisma";

/**
 * 계약/결제 조회(read) 쿼리 (SPEC-006 FR-011, FR-012, 7장 UI).
 */

/**
 * 계약 상세 — 프로그램 요약, 신청자(팬), 결제 내역 포함 (FR-011, FR-012).
 * 계약 페이지(`/contracts/[id]`) 렌더에 사용된다.
 */
export function getContractDetail(contractId: string) {
  return prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      application: {
        include: {
          user: { select: { id: true, name: true } },
          program: {
            include: {
              creatorProfile: { select: { id: true, studioName: true, userId: true } },
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        include: { settlement: true },
      },
    },
  });
}

/**
 * 팬의 결제 내역 (7장 `/dashboard/fan/payments`).
 * 계약 결제만 대상으로 하며(contractId 존재), 최신순 정렬.
 */
export function listFanPayments(fanUserId: string) {
  return prisma.payment.findMany({
    where: { fanUserId, contractId: { not: null } },
    orderBy: { createdAt: "desc" },
    include: {
      settlement: true,
      contract: {
        include: {
          application: {
            include: { program: { select: { id: true, title: true } } },
          },
        },
      },
    },
  });
}

/**
 * 팬의 계약 진행 대상 — ACCEPTED 신청 목록 (계약/결제 진입점).
 * 결제 흐름 시연을 위해 fan 대시보드에서 사용된다.
 */
export function listFanAcceptedApplications(fanUserId: string) {
  return prisma.programApplication.findMany({
    where: { userId: fanUserId, status: "ACCEPTED" },
    orderBy: { updatedAt: "desc" },
    include: {
      program: { select: { id: true, title: true, priceKrw: true, status: true } },
      contract: {
        include: { payments: { select: { id: true, status: true } } },
      },
    },
  });
}
