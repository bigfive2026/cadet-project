"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatKrw } from "@/lib/format";

/**
 * PAID 포스트 단건 구매 버튼 + 확인 모달 + 완료 안내 (SPEC-009 FR-003, FR-009, AC-002/003/009).
 *
 * - 비로그인(isLoggedIn=false): "구매하기"가 로그인으로 유도한다 (FR-009).
 * - 로그인: 확인 모달(제목/금액/수수료 안내) → POST /api/posts/:id/purchase.
 * - 성공 시 완료 토스트 표시 후 router.refresh()로 본문을 다시 불러온다 (AC-003).
 */
export function PurchaseButton({
  postId,
  title,
  priceKrw,
  isLoggedIn,
}: {
  postId: string;
  title: string;
  priceKrw: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // 표시용 수수료 — 서버 계산(NFR-003)과 동일한 정책.
  const feeKrw = Math.round(priceKrw * 0.1);

  async function handlePurchase() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${postId}/purchase`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // 이미 구매(409)는 본문을 바로 열어준다.
        if (res.status === 409) {
          setOpen(false);
          router.refresh();
          return;
        }
        setError(body.error ?? "결제에 실패했습니다.");
        return;
      }
      setDone(true);
      setOpen(false);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <p className="rounded bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        결제가 완료되었습니다. 콘텐츠를 확인하세요.
      </p>
    );
  }

  if (!isLoggedIn) {
    return (
      <a
        href="/login"
        className="inline-block rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        구매하기
      </a>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>구매하기 · {formatKrw(priceKrw)}</Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="구매 확인"
        >
          <div className="w-full max-w-sm space-y-4 rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">유료 콘텐츠 구매</h2>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{title}</p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">결제 금액</span>
                <span>{formatKrw(priceKrw)}</span>
              </p>
              <p className="flex justify-between text-xs text-muted-foreground">
                <span>플랫폼 수수료 (10%)</span>
                <span>{formatKrw(feeKrw)}</span>
              </p>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                취소
              </Button>
              <Button onClick={handlePurchase} disabled={pending}>
                {pending ? "결제 중..." : "결제하기"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
