import { prisma } from "@/lib/prisma";

/**
 * 알림 서비스 (SPEC-005 FR-014, AC-009).
 *
 * 개별/전체 읽음 표시 기능을 제공한다.
 */

export type NotificationServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

/**
 * 개별 알림 읽음 표시 (FR-014).
 *
 * 본인 알림(userId 일치)만 업데이트된다.
 */
export async function markNotificationRead(
  userId: string,
  id: string,
): Promise<NotificationServiceResult<{ id: string }>> {
  await prisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });

  return { ok: true, data: { id } };
}

/**
 * 전체 알림 읽음 표시 (FR-014, AC-009).
 *
 * 사용자의 모든 읽지 않은 알림(readAt: null)을 읽음으로 표시한다.
 * 업데이트된 수를 반환한다.
 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  return result.count;
}
