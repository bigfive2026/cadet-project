"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bell, Check, X, AlertCircle } from "lucide-react";

/**
 * 알림 타입별 아이콘 매핑 (SPEC-005 NFR-005).
 */
const iconMap: Record<string, React.ElementType> = {
  APPLICATION_CREATED: Bell,
  APPLICATION_ACCEPTED: Check,
  APPLICATION_REJECTED: X,
  APPLICATION_AUTO_REJECTED: X,
  PROGRAM_CLOSED: AlertCircle,
};

/**
 * 알림 목록 (SPEC-005 FR-014, AC-006).
 */
interface NotificationListProps {
  notifications: Array<{
    id: string;
    type: string;
    message: string;
    linkUrl: string | null;
    readAt: Date | string | null;
    createdAt: Date | string;
  }>;
}

export function NotificationList({ notifications }: NotificationListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleReadAll = () => {
    startTransition(async () => {
      try {
        await fetch("/api/notifications/read-all", { method: "PATCH" });
        router.refresh();
      } catch {
        // 실패 시 무음 (UX 간소화)
      }
    });
  };

  const handleNotificationClick = async (
    notificationId: string,
    linkUrl: string | null,
  ) => {
    startTransition(async () => {
      try {
        // 읽음 처리
        await fetch(`/api/notifications/${notificationId}/read`, {
          method: "PATCH",
        });

        // 링크가 있으면 이동, 없으면 알림 페이지 유지
        if (linkUrl) {
          router.push(linkUrl);
        } else {
          router.refresh();
        }
      } catch {
        // 실패 시 무음
      }
    });
  };

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Bell className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">알림이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">알림</h1>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={handleReadAll}
        >
          전체 읽음
        </Button>
      </div>

      <ul className="space-y-2">
        {notifications.map((notification) => {
          const Icon = iconMap[notification.type] || Bell;
          const isUnread = !notification.readAt;

          return (
            <li
              key={notification.id}
              className={cn(
                "group flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 cursor-pointer",
                isUnread && "bg-muted/30",
              )}
              onClick={() =>
                handleNotificationClick(notification.id, notification.linkUrl)
              }
            >
              <div
                className={cn(
                  "mt-0.5 shrink-0",
                  isUnread ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <p
                  className={cn(
                    "text-sm",
                    isUnread && "font-semibold",
                  )}
                >
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(notification.createdAt).toLocaleString("ko-KR", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {isUnread && (
                <div className="shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
