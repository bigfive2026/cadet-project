import Link from "next/link";
import {
  SquarePen,
  Image as ImageIcon,
  Palette,
  CalendarDays,
  CalendarPlus,
  Users,
  Star,
  MessagesSquare,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { getCreatorStudio } from "@/lib/queries/studio";
import { cn } from "@/lib/utils";

/**
 * 크리에이터 대시보드 요약 (SPEC-002 AC-004).
 * CREATOR만 접근 가능. 스튜디오 요약 + 주요 액션 링크.
 */
export default async function CreatorDashboardPage() {
  const user = await requireRole("CREATOR");
  const profile = user.creatorProfile;
  const studio = profile ? await getCreatorStudio(profile.id) : null;
  const activeMemberCount =
    studio?.plans.reduce((total, plan) => total + plan.memberships.length, 0) ?? 0;
  const publishedPostCount = studio?.posts.length ?? 0;
  const publicProgramCount = studio?.programs.length ?? 0;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">크리에이터 스튜디오</h1>
        <p className="text-sm text-muted-foreground">안녕하세요, {user.name}님.</p>
      </header>

      {profile ? (
        <section className="space-y-4 rounded-[var(--radius-card)] border border-border-default bg-white px-7 py-6 shadow-card">
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xl font-bold text-brand-primary">
              {profile.studioName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate font-heading text-2xl font-bold text-text-default">
                  {profile.studioName}
                </h2>
                <Badge variant="membership">크리에이터</Badge>
              </div>
            </div>
            <Link
              href="/dashboard/creator/edit"
              aria-label="스튜디오 편집"
              className="shrink-0 rounded-[var(--radius-control)] border border-border-default bg-white px-3.5 py-2 text-sm text-text-default transition-colors hover:border-brand-primary hover:text-brand-primary"
            >
              편집
            </Link>
          </div>

          <p className="text-sm leading-[22px] text-text-default">
            {profile.bio ?? "아직 스튜디오 소개가 없습니다."}
          </p>

          <dl className="grid overflow-hidden rounded-[12px] border border-border-default bg-white sm:grid-cols-3">
            <CreatorStat label="멤버" value={activeMemberCount} />
            <CreatorStat label="포스트" value={publishedPostCount} bordered />
            <CreatorStat label="프로그램" value={publicProgramCount} bordered />
          </dl>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-text-default">
            {profile.category ? <MetaItem label="카테고리" value={profile.category} /> : null}
            {profile.instagramUrl ? <MetaItem label="Instagram" value={profile.instagramUrl} /> : null}
            {profile.websiteUrl ? <MetaItem label="Website" value={profile.websiteUrl} /> : null}
          </div>
        </section>
      ) : (
        // H3: 프로필 미보유 크리에이터 첫 화면 가이드.
        // 스튜디오 섹션이 통째로 사라져 길을 잃지 않도록 시작 액션을 안내한다.
        <section className="space-y-2 rounded-[var(--radius-card)] border border-dashed border-border-default bg-white p-4">
          <h2 className="font-heading text-lg font-semibold">
            스튜디오를 시작해 볼까요?
          </h2>
          <p className="text-sm text-muted-foreground">
            아직 스튜디오 정보가 없습니다. 첫 포스트를 올리거나 프로그램을 만들어
            바로 시작할 수 있어요.
          </p>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2">
        {[
          { href: "/dashboard/creator/artworks", label: "작품 관리", Icon: ImageIcon },
          { href: "/dashboard/creator/works", label: "작업 관리", Icon: Palette },
          { href: "/dashboard/creator/posts/new", label: "포스트 작성", Icon: SquarePen },
          { href: "/dashboard/creator/programs", label: "내 프로그램", Icon: CalendarDays },
          { href: "/dashboard/creator/programs/new", label: "프로그램 만들기", Icon: CalendarPlus },
          { href: "/dashboard/creator/members", label: "멤버 관리", Icon: Users },
          { href: "/dashboard/creator/memberships", label: "멤버십 관리", Icon: Star },
          ...(profile
            ? [
                {
                  href: `/creators/${profile.id}?tab=community`,
                  label: "내 커뮤니티",
                  Icon: MessagesSquare,
                },
              ]
            : []),
        ].map(({ href, label, Icon }) => (
          <QuickLink key={href} href={href} label={label} Icon={Icon} />
        ))}
      </section>
    </div>
  );
}

function QuickLink({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-[var(--radius-card)] border border-border-default bg-white px-5 py-4 shadow-card transition-colors hover:border-brand-primary"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-brand-subtle text-brand-primary">
        <Icon className="size-5" />
      </span>
      <span className="flex-1 text-sm font-semibold text-text-default">{label}</span>
      <ChevronRight className="size-4 text-text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function CreatorStat({
  label,
  value,
  bordered = false,
}: {
  label: string;
  value: number;
  bordered?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 px-5 py-4 text-center",
        bordered && "border-t border-border-default sm:border-l sm:border-t-0",
      )}
    >
      <dt className="order-2 text-sm text-text-muted">{label}</dt>
      <dd className="order-1 text-xl font-bold leading-7 text-text-default">
        {value.toLocaleString("ko-KR")}
      </dd>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-text-muted">{label}</span>
      <span className="truncate">{value}</span>
    </span>
  );
}
