"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * 계약 진입 버튼 (SPEC-006 FR-001, AC-001).
 *
 * ACCEPTED 신청에 대해 계약을 생성/조회(getOrCreateContract)한 뒤
 * `/contracts/[id]`로 이동한다. 계약이 이미 있으면 멱등하게 기존 것으로 이동.
 */
export function OpenContractButton({
  applicationId,
  label = "계약 진행",
}: {
  applicationId: string;
  label?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/applications/${applicationId}/contract`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          setError("계약을 열 수 없습니다.");
          return;
        }
        router.push(`/contracts/${data.id}`);
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={handleClick} disabled={isPending}>
        {isPending ? "여는 중..." : label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
