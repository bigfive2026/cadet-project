import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listMyApplications } from "@/lib/queries/applications";
import { listMyMemberships } from "@/lib/queries/members";
import { listFanPayments } from "@/lib/queries/contracts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

/**
 * 팬 홈 대시보드 (PRD §13.1 필수 페이지 — /dashboard/fan).
 * 팬의 전체 활동(신청·멤버십·결제)을 한 화면에서 요약하고
 * 각 하위 페이지로 진입할 수 있도록 한다. 미인증 시 /login 으로 보낸다.
 */
export default async function FanHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [applications, memberships, payments] = await Promise.all([
    listMyApplications(user.id),
    listMyMemberships(user.id),
    listFanPayments(user.id),
  ]);

  const pendingApplications = applications.filter((a) => a.status === "PENDING").length;
  const acceptedApplications = applications.filter((a) => a.status === "ACCEPTED").length;
  const paidPayments = payments.filter(
    (p) => p.status === "PAID" || p.status === "RELEASED",
  ).length;
  const pendingPayments = payments.filter((p) => p.status === "PENDING").length;

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          안녕하세요, {user.name}님
        </h1>
        <p className="text-sm text-muted-foreground">
          내 활동을 한눈에 확인하고 이어서 진행해 보세요.
        </p>
      </header>

      {/* 요약 카드 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>신청 현황</CardDescription>
            <CardTitle className="text-2xl">{applications.length}건</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            대기 {pendingApplications} · 수락 {acceptedApplications}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>내 멤버십</CardDescription>
            <CardTitle className="text-2xl">{memberships.length}개</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            활성 멤버십 구독 중
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>결제</CardDescription>
            <CardTitle className="text-2xl">{paidPayments}건 완료</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {pendingPayments > 0 ? `진행 중 ${pendingPayments}건` : "대기 중 결제 없음"}
          </CardContent>
        </Card>
      </div>

      {/* 빠른 링크 */}
      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">둘러보기</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/creators"
            className={buttonVariants({ variant: "outline", className: "justify-start" })}
          >
            작가 둘러보기
          </Link>
          <Link
            href="/programs"
            className={buttonVariants({ variant: "outline", className: "justify-start" })}
          >
            프로그램 탐색
          </Link>
          <Link
            href="/dashboard/fan/bookmarks"
            className={buttonVariants({ variant: "outline", className: "justify-start" })}
          >
            관심 작가
          </Link>
          <Link
            href="/dashboard/fan/memberships"
            className={buttonVariants({ variant: "outline", className: "justify-start" })}
          >
            내 멤버십
          </Link>
          <Link
            href="/dashboard/fan/payments"
            className={buttonVariants({ variant: "outline", className: "justify-start" })}
          >
            결제 내역
          </Link>
        </div>
      </section>

      {/* 최근 신청 미리보기 */}
      {applications.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">최근 신청</h2>
            <Link
              href="/dashboard/fan/payments"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              전체 보기
            </Link>
          </div>
          <ul className="divide-y rounded-xl ring-1 ring-foreground/10">
            {applications.slice(0, 5).map((app) => (
              <li key={app.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{app.program.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {app.program.priceKrw.toLocaleString("ko-KR")}원
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{app.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
