"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * 프로그램 완료 승인 버튼 (SPEC-008 FR-001, FR-003, FR-004, AC-001~AC-003).
 * 크리에이터 본인의 IN_PROGRESS 프로그램에서만 활성화된다.
 * 클릭 시 POST /api/programs/:id/complete 호출.
 */
export function CompleteButton({ programId }: { programId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleComplete() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/programs/${programId}/complete`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "완료 처리에 실패했습니다.");
        return;
      }
      setDone(true);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm text-muted-foreground">프로그램이 완료 처리되었습니다.</p>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleComplete}
        disabled={pending}
        className="w-full"
      >
        {pending ? "처리 중..." : "프로그램 완료 처리"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
