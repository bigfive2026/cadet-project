"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * 프로그램 참여 신청 버튼 (SPEC-005 FR-001, AC-001).
 *
 * - 본인 프로그램이거나 모집 중이 아닌 경우 null을 렌더링
 * - 이미 신청한 경우 disabled "신청 완료" 버튼 표시
 * - 그 외 경우 신청 폼 (메시지 입력 옵션) 표시
 */
interface ApplyButtonProps {
  programId: string;
  applied: boolean;
  recruiting: boolean;
  owner: boolean;
}

export function ApplyButton({ programId, applied, recruiting, owner }: ApplyButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 본인 프로그램이거나 모집 중이 아닌 경우 표시하지 않음
  if (!recruiting || owner) {
    return null;
  }

  // 이미 신청한 경우 disabled 버튼 표시
  if (applied) {
    return (
      <Button disabled variant="outline">
        신청 완료
      </Button>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/programs/${programId}/applications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: message || null }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 409) {
            setError("이미 신청했습니다.");
          } else if (response.status === 400) {
            setError(data.error || "본인 프로그램에는 신청할 수 없습니다.");
          } else if (response.status === 401) {
            setError("로그인이 필요합니다.");
          } else {
            setError("신청 중 오류가 발생했습니다.");
          }
          return;
        }

        setSuccess(true);
        // 페이지 새로고침으로 상태 업데이트
        router.refresh();
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  };

  return (
    <div className="space-y-2">
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400">
          신청이 완료되었습니다.
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            className="block text-sm font-medium mb-1"
            htmlFor="application-message"
          >
            메시지 (선택)
          </label>
          <textarea
            id="application-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full rounded border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="크리에이터에게 전하고 싶은 말을 입력해주세요."
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "신청 중..." : "참여 신청"}
        </Button>
      </form>
    </div>
  );
}
