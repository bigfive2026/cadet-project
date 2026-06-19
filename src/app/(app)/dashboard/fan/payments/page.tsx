import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  listFanAcceptedApplications,
  listFanPayments,
} from "@/lib/queries/contracts";
import { Card } from "@/components/ui/card";
import { OpenContractButton } from "@/components/contracts/OpenContractButton";
import { formatKrw } from "@/lib/format";

/**
 * 팬 결제 대시보드 (SPEC-006 7장 UI, FR-010).
 *
 * 상단: 계약 진행 대상(ACCEPTED 신청) — 미결제 건은 계약/결제로 진입.
 * 하단: 결제 내역(상태 배지).
 */
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "결제 대기",
  PAID: "결제 완료",
  RELEASED: "정산 완료",
  REFUNDED: "환불",
  FAILED: "실패",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  RELEASED: "bg-blue-100 text-blue-800",
  REFUNDED: "bg-gray-100 text-gray-800",
  FAILED: "bg-red-100 text-red-800",
};

export default async function FanPaymentsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl py-6">
        <p className="text-sm text-muted-foreground">로그인이 필요합니다.</p>
      </div>
    );
  }

  const [accepted, payments] = await Promise.all([
    listFanAcceptedApplications(user.id),
    listFanPayments(user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-6">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">계약 진행</h1>
        {accepted.length === 0 ? (
          <p className="text-sm text-muted-foreground">수락된 참여 신청이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {accepted.map((app) => {
              const paid = app.contract?.payments.some(
                (p) => p.status === "PAID" || p.status === "RELEASED",
              );
              return (
                <li key={app.id}>
                  <Card className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{app.program.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatKrw(app.program.priceKrw)}
                      </p>
                    </div>
                    {paid && app.contract ? (
                      <Link
                        href={`/contracts/${app.contract.id}`}
                        className="text-sm text-green-600 underline-offset-4 hover:underline dark:text-green-400"
                      >
                        결제 완료 →
                      </Link>
                    ) : (
                      <OpenContractButton applicationId={app.id} />
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">결제 내역</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">결제 내역이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {payments.map((p) => (
              <li key={p.id}>
                <Card className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">
                      {p.contract?.application.program.title ?? "프로그램"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatKrw(p.amount)} · 수수료 {formatKrw(p.feeKrw)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      PAYMENT_STATUS_STYLES[p.status] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
