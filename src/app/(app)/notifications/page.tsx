import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications } from "@/lib/queries/notifications";
import { NotificationList } from "@/components/notification/NotificationList";

/**
 * 알림 페이지 (SPEC-005 FR-014, AC-006).
 *
 * - 로그인한 사용자만 접근 가능
 * - 최신 알림 목록을 표시
 * - 읽음 처리 및 링크 이동 가능
 */
export default async function NotificationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const notifications = await listNotifications(user.id);

  return (
    <main className="mx-auto max-w-2xl space-y-6 py-8">
      <NotificationList notifications={notifications} />
    </main>
  );
}
