import { prisma } from "@/lib/prisma";

/**
 * 알림 조회(read) 쿼리 (SPEC-005 FR-014, AC-007).
 */

/**
 * 사용자 알림 목록 (FR-014).
 * 최신순 정렬.
 */
export function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * 읽지 않은 알림 수 (FR-014, AC-007).
 * 뱃지 표시용으로 사용된다.
 */
export function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}
