import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/queries/notifications";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 알림 벨 서버 컴포넌트 (SPEC-005 FR-014, AC-007).
 *
 * - 미읽음 알림 수를 표시하는 배지와 함께 벨 아이콘을 렌더링
 * - 로그인하지 않은 경우 null을 반환
 * - 알림 페이지로 링크
 */
export async function NotificationBell() {
  const user = await getCurrentUser();
  if (!user) return null;

  const unreadCount = await getUnreadNotificationCount(user.id);

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center justify-center p-2 rounded-md hover:bg-muted transition-colors"
      aria-label={`알림${unreadCount > 0 ? ` (${unreadCount}개)` : ""}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span
          className={cn(
            "absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full",
            "bg-destructive text-[10px] font-medium text-destructive-foreground",
            unreadCount > 9 && "h-5 w-5 text-[9px]",
          )}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
