"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 신청 상태 배지 스타일 (SPEC-005 FR-003).
 */
const statusStyles: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  ACCEPTED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  AUTO_REJECTED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

const statusLabels: Record<string, string> = {
  PENDING: "대기 중",
  ACCEPTED: "수락",
  REJECTED: "거절",
  AUTO_REJECTED: "자동 거절",
};

/**
 * 크리에이터 프로그램 신청 목록 (SPEC-005 FR-002, AC-003, AC-004).
 */
interface ApplicationListProps {
  programId: string;
  applications: Array<{
    id: string;
    userId: string;
    status: string;
    message?: string | null;
    createdAt: Date | string;
    user: {
      id: string;
      name: string;
    };
  }>;
}

export function ApplicationList({ applications }: ApplicationListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [autoRejectOthers, setAutoRejectOthers] = useState(false);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const handleAction = async (applicationId: string, action: "accept" | "reject") => {
    setFeedback((prev) => ({ ...prev, [applicationId]: "" }));

    startTransition(async () => {
      try {
        const response = await fetch(`/api/applications/${applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            autoRejectOthers: action === "accept" ? autoRejectOthers : false,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setFeedback((prev) => ({
            ...prev,
            [applicationId]: data.error || "처리 중 오류가 발생했습니다.",
          }));
          return;
        }

        if (data.autoRejectedCount > 0) {
          setFeedback((prev) => ({
            ...prev,
            [applicationId]: `${data.autoRejectedCount}건의 대기 신청이 자동 거절되었습니다.`,
          }));
        }

        // 페이지 새로고침으로 상태 업데이트
        router.refresh();
      } catch {
        setFeedback((prev) => ({
          ...prev,
          [applicationId]: "네트워크 오류가 발생했습니다.",
        }));
      }
    });
  };

  if (applications.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        아직 신청이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {applications.map((application) => (
        <div
          key={application.id}
          className="border rounded-lg p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium truncate">{application.user.name}</h3>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    statusStyles[application.status],
                  )}
                >
                  {statusLabels[application.status] || application.status}
                </span>
              </div>
              {application.message ? (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {application.message}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(application.createdAt).toLocaleString("ko-KR")}
              </p>
            </div>

            {application.status === "PENDING" && (
              <div className="flex flex-col gap-2 shrink-0">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    disabled={isPending}
                    onClick={() => handleAction(application.id, "accept")}
                  >
                    수락
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => handleAction(application.id, "reject")}
                  >
                    거절
                  </Button>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={autoRejectOthers}
                    onChange={(e) => setAutoRejectOthers(e.target.checked)}
                    className="rounded"
                  />
                  수락 시 다른 대기 신청 자동 거절
                </label>
              </div>
            )}
          </div>

          {feedback[application.id] && (
            <p
              className={cn(
                "text-sm",
                feedback[application.id].includes("자동 거절")
                  ? "text-green-600 dark:text-green-400"
                  : "text-destructive",
              )}
            >
              {feedback[application.id]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
