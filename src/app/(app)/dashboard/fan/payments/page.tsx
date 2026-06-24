import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  listFanAcceptedApplications,
  listFanPayments,
} from "@/lib/queries/contracts";
import { Card } from "@/components/ui/card";
import { ArtworkIssueReporter } from "@/components/artworks/ArtworkIssueReporter";
import {
  MyApplicationItem,
  type MyApplicationItemData,
} from "@/components/applications/MyApplicationItem";
import { formatKrw } from "@/lib/format";

/**
 * 팬 마이페이지 결제 대시보드.
 *
 * 상단: 프로그램 참여 진행 대상 — 미결제 건은 프로그램 체크아웃으로 진입.
 * 하단: 결제 내역(상태 배지).
 */
// 팬 관점 라벨: 정산(RELEASED)은 크리에이터/관리자 정보이므로 팬에게는 '결제 완료'로 통일.
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "결제 대기",
  PAID: "결제 완료",
  RELEASED: "결제 완료",
  REFUNDED: "환불",
  FAILED: "실패",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  PAID: "bg-green-100 text-green-800",
  RELEASED: "bg-green-100 text-green-800",
  REFUNDED: "bg-gray-100 text-gray-800",
  FAILED: "bg-red-100 text-red-800",
};

type FanPayment = Awaited<ReturnType<typeof listFanPayments>>[number];

function paymentTitle(payment: FanPayment) {
  return (
    payment.membership?.plan.title ??
    payment.post?.title ??
    payment.programApplication?.program.title ??
    payment.artworkOrder?.artwork.title ??
    payment.contract?.application.program.title ??
    "결제"
  );
}

function paymentKind(payment: FanPayment) {
  if (payment.membership) return "멤버십";
  if (payment.post) return "포스트";
  if (payment.programApplication) return "프로그램";
  if (payment.artworkOrder) return "작품";
  if (payment.contract) return "프로그램";
  return "기타";
}

function paymentLink(payment: FanPayment) {
  if (payment.membership) return "/dashboard/fan/memberships";
  if (payment.post) return `/posts/${payment.post.id}`;
  if (payment.programApplication) return `/programs/${payment.programApplication.program.id}`;
  if (payment.artworkOrder) return `/artwork-orders/${payment.artworkOrder.id}`;
  if (payment.contract) return `/programs/${payment.contract.application.program.id}`;
  return null;
}

function artworkOrderText(payment: FanPayment) {
  const order = payment.artworkOrder;
  if (!order) return null;
  const shipment = order.shipment
    ? `${order.shipment.carrier} ${order.shipment.trackingNo}`
    : "발송 대기";
  return `${order.status} · ${shipment}`;
}

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
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-text-default">
          마이페이지
        </h1>
        <p className="text-sm text-text-muted">
          신청, 작품 주문, 멤버십, 결제 내역을 한곳에서 확인하세요.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/fan/applications"
          className="rounded-[12px] border border-border-default bg-white p-4 transition-colors hover:border-brand-primary hover:bg-brand-subtle"
        >
          <p className="text-sm font-semibold text-text-default">프로그램 신청</p>
          <p className="mt-1 text-xs text-text-muted">참여 신청과 확정 상태를 확인합니다.</p>
        </Link>
        <Link
          href="/dashboard/fan/artwork-orders"
          className="rounded-[12px] border border-border-default bg-white p-4 transition-colors hover:border-brand-primary hover:bg-brand-subtle"
        >
          <p className="text-sm font-semibold text-text-default">작품 주문</p>
          <p className="mt-1 text-xs text-text-muted">배송, 수령, 문제 신고를 관리합니다.</p>
        </Link>
        <Link
          href="/dashboard/fan/memberships"
          className="rounded-[12px] border border-border-default bg-white p-4 transition-colors hover:border-brand-primary hover:bg-brand-subtle"
        >
          <p className="text-sm font-semibold text-text-default">멤버십</p>
          <p className="mt-1 text-xs text-text-muted">가입한 작가 멤버십을 봅니다.</p>
        </Link>
        <Link
          href="/dashboard/fan/payments"
          className="rounded-[12px] border border-border-default bg-white p-4 transition-colors hover:border-brand-primary hover:bg-brand-subtle"
        >
          <p className="text-sm font-semibold text-text-default">결제 내역</p>
          <p className="mt-1 text-xs text-text-muted">멤버십, 프로그램, 작품 결제를 모아봅니다.</p>
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">프로그램 참여</h2>
        {accepted.length === 0 ? (
          <p className="text-sm text-muted-foreground">진행 중인 프로그램 참여가 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {accepted.map((app) => {
              const completed = !!app.completionApprovedAt;
              const paid = app.payment?.status === "PAID" || app.payment?.status === "RELEASED";
              // 완료 건은 actionSlot을 비워 MyApplicationItem의 리뷰 작성/조회 동선이 노출되게 한다.
              // 진행 중인 건은 결제 진입 액션을 actionSlot으로 표시한다.
              const action = completed ? undefined : paid ? (
                <Link
                  href={`/programs/${app.program.id}`}
                  className="text-sm text-green-600 underline-offset-4 hover:underline dark:text-green-400"
                >
                  결제 완료 →
                </Link>
              ) : (
                <Link
                  href={`/programs/${app.program.id}/checkout`}
                  className="text-sm font-medium text-brand-primary underline-offset-4 hover:underline"
                >
                  결제 진행하기 →
                </Link>
              );
              return (
                <MyApplicationItem
                  key={app.id}
                  application={app as MyApplicationItemData}
                  actionSlot={action}
                />
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
            {payments.map((p) => {
              const href = paymentLink(p);
              const title = paymentTitle(p);
              const artworkText = artworkOrderText(p);
              const hasOpenIssue = p.artworkOrder?.issues.some((issue) =>
                ["OPEN", "REVIEWING"].includes(issue.status),
              );

              return (
                <li key={p.id}>
                  <Card className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-start">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-medium text-text-muted">{paymentKind(p)}</p>
                      {href ? (
                        <Link
                          href={href}
                          className="block min-w-0 font-medium text-text-default underline-offset-4 hover:underline"
                        >
                          {title}
                        </Link>
                      ) : (
                        <p className="font-medium">{title}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {formatKrw(p.amount)} · 수수료 {formatKrw(p.feeKrw)}
                      </p>
                      {artworkText ? (
                        <p className="text-xs text-text-muted">{artworkText}</p>
                      ) : null}
                      {p.artworkOrder ? (
                        <ArtworkIssueReporter
                          orderId={p.artworkOrder.id}
                          disabled={hasOpenIssue}
                        />
                      ) : null}
                      <Link
                        href={`/dashboard/fan/payments/${p.id}/receipt`}
                        className="inline-flex text-xs font-medium text-brand-primary underline-offset-4 hover:underline"
                      >
                        영수증 발행
                      </Link>
                    </div>
                    <span
                      className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        PAYMENT_STATUS_STYLES[p.status] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
