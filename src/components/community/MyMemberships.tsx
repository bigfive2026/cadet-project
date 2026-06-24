/**
 * 팬 본인의 멤버십 목록 (SPEC-007 FR-011, AC-008).
 * Figma 16 디자인 정합 — 바이올렛 커버 카드 그리드(크라운+MEMBERSHIP 배지+플랜+가격+스튜디오).
 * 표시 데이터는 코드 실제값(plan.title, priceKrw, studioName), 취소 기능은 카드 내부에 통합한다.
 */
import Link from "next/link";
import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { CancelMembershipButton } from "@/components/community/CancelMembershipButton";

interface MyMembershipRow {
  id: string;
  status?: string;
  startedAt: Date | string;
  cancelledAt?: Date | string | null;
  plan: {
    id: string;
    title: string;
    priceKrw: number;
    creatorProfile: { id: string; studioName: string };
  };
}

interface MyMembershipsProps {
  memberships: MyMembershipRow[];
}

export function MyMemberships({ memberships }: MyMembershipsProps) {
  if (memberships.length === 0) {
    return (
      <div className="space-y-4 rounded-xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          가입한 멤버십이 없습니다. 관심 있는 작가의 멤버십을 둘러보세요.
        </p>
        <Link href="/creators" className={buttonVariants({ variant: "outline" })}>
          작가 둘러보기
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {memberships.map((membership) => {
        const active = membership.status === "ACTIVE" || !membership.status;

        return (
          <li
            key={membership.id}
            className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border-default bg-white shadow-card"
          >
            <div className="flex h-28 items-center justify-center bg-[linear-gradient(135deg,#ede9fe_0%,#ddd6fe_100%)] text-violet-500">
              <Crown className="size-8" />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-5">
              <Badge variant="membership" className="w-fit">
                MEMBERSHIP
              </Badge>
              <h3 className="font-heading text-lg font-bold leading-tight text-text-default">
                {membership.plan.title}
              </h3>
              <p className="text-sm text-text-muted">
                월 {membership.plan.priceKrw.toLocaleString("ko-KR")}원
              </p>
              <p className="text-xs text-text-muted">
                상태: {active ? "활성" : "취소됨"}
                {membership.cancelledAt
                  ? ` · ${formatDate(membership.cancelledAt)} 취소`
                  : ""}
              </p>
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-border-default pt-3">
                <Link
                  href={`/creators/${membership.plan.creatorProfile.id}`}
                  className="min-w-0 truncate text-sm font-semibold text-text-default transition-colors hover:text-brand-primary"
                >
                  {membership.plan.creatorProfile.studioName}
                </Link>
                {active ? <CancelMembershipButton membershipId={membership.id} /> : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
