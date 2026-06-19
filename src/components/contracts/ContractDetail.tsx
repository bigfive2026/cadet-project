"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatKrw } from "@/lib/format";

/**
 * 계약 상세 + 서명/Mock 결제 UI (SPEC-006 FR-003~FR-005, FR-010, FR-012, AC-002~AC-007).
 *
 * - 팬 본인: 약관 동의 체크박스 → 서명 → 결제 흐름
 * - 크리에이터(소유자): 읽기 전용 (서명/결제 버튼 비활성 — FR-012, AC-007)
 * - 결제 완료: PaymentSuccessCard 표시 (금액/수수료/정산 예정액)
 */
export interface ContractDetailProps {
  contractId: string;
  programTitle: string;
  amount: number;
  feeKrw: number;
  payout: number;
  agreementText: string;
  fanName: string;
  creatorName: string;
  signed: boolean;
  paid: boolean;
  viewer: "fan" | "creator";
}

export function ContractDetail(props: ContractDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const readOnly = props.viewer === "creator";

  const handleSign = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/contracts/${props.contractId}/sign`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agreed: true }),
        });
        if (!res.ok) {
          setError(res.status === 400 ? "약관에 동의해야 서명할 수 있습니다." : "서명 중 오류가 발생했습니다.");
          return;
        }
        router.refresh();
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  };

  const handlePay = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/contracts/${props.contractId}/payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "mock" }),
        });
        if (!res.ok) {
          setError(
            res.status === 409 ? "이미 결제가 완료된 계약입니다." : "결제 중 오류가 발생했습니다.",
          );
          return;
        }
        router.refresh();
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-6">
        <div>
          <h1 className="text-xl font-semibold">{props.programTitle}</h1>
          <p className="text-sm text-muted-foreground">참여 계약</p>
        </div>

        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">크리에이터</dt>
          <dd className="text-right">{props.creatorName}</dd>
          <dt className="text-muted-foreground">참여자</dt>
          <dd className="text-right">{props.fanName}</dd>
          <dt className="text-muted-foreground">계약 금액</dt>
          <dd className="text-right font-medium">{formatKrw(props.amount)}</dd>
        </dl>

        <div className="rounded border border-border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
          {props.agreementText}
        </div>
      </Card>

      {props.paid ? (
        <PaymentSuccessCard amount={props.amount} feeKrw={props.feeKrw} payout={props.payout} />
      ) : (
        <Card className="space-y-4 p-6">
          {readOnly ? (
            <p className="text-sm text-muted-foreground">
              읽기 전용 — 크리에이터는 서명/결제를 진행할 수 없습니다.
            </p>
          ) : (
            <>
              {error && <p className="text-sm text-destructive">{error}</p>}

              {!props.signed && (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>위 약관을 모두 확인했으며 이에 동의합니다.</span>
                </label>
              )}

              <div className="flex gap-2">
                {!props.signed ? (
                  <Button onClick={handleSign} disabled={!agreed || isPending}>
                    {isPending ? "처리 중..." : "동의하고 서명"}
                  </Button>
                ) : (
                  <span className="inline-flex items-center text-sm text-green-600 dark:text-green-400">
                    서명 완료
                  </span>
                )}
                <Button onClick={handlePay} disabled={!props.signed || isPending} variant={props.signed ? "default" : "outline"}>
                  {isPending ? "처리 중..." : "결제하기"}
                </Button>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

/** 결제 완료 카드 — 금액/수수료/정산 예정액 (FR-010, AC-004). */
function PaymentSuccessCard({
  amount,
  feeKrw,
  payout,
}: {
  amount: number;
  feeKrw: number;
  payout: number;
}) {
  return (
    <Card className="space-y-3 border-green-200 bg-green-50 p-6 dark:border-green-900/40 dark:bg-green-900/10">
      <h2 className="font-semibold text-green-700 dark:text-green-400">결제가 완료되었습니다</h2>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-muted-foreground">결제 금액</dt>
        <dd className="text-right">{formatKrw(amount)}</dd>
        <dt className="text-muted-foreground">플랫폼 수수료 (10%)</dt>
        <dd className="text-right">{formatKrw(feeKrw)}</dd>
        <dt className="text-muted-foreground">크리에이터 정산 예정액</dt>
        <dd className="text-right font-medium">{formatKrw(payout)}</dd>
      </dl>
    </Card>
  );
}
