import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProgramCardList } from "@/components/studio/ProgramCardList";
import { formatKrw } from "@/components/studio/MembershipPlanCardList";
import { CreatorRatingSummary } from "@/components/creators/CreatorRatingSummary";

/**
 * 공개 스튜디오 '소개' 탭 — 포트폴리오 스크롤 (Merge PRD: 소개 탭 재구성).
 *
 * 프레젠테이션 전용 컴포넌트. 데이터 fetch/쿼리/스키마 변경 없이 getCreatorStudio가
 * 이미 로드한 studio(posts/plans/programs/works)를 위→아래 서사로 재배치한다.
 * 섹션: 스탯 행 → 작가 소개 → (평점 요약) → 작품 갤러리(CreatorWork) → 진행 프로그램 → 멤버십 CTA.
 * 모든 색/모서리/그림자는 한진 디자인 토큰을 사용한다(류진 하드코딩 hex 금지).
 */
export interface StudioPortfolioIntroProps {
  studio: {
    studioName: string;
    bio?: string | null;
    category?: string | null;
    // 스탯 파생용 — 길이만 사용한다(추가 쿼리 없음).
    posts?: Array<unknown>;
    plans?: Array<{
      id: string;
      title: string;
      description?: string | null;
      priceKrw: number;
      // getCreatorStudio가 ACTIVE 멤버십 id를 include함 → 후원자 수 파생에 사용.
      memberships?: Array<{ id: string }>;
    }>;
    programs?: Array<{
      id: string;
      title: string;
      description?: string | null;
      category?: string | null;
      priceKrw: number;
    }>;
    works?: Array<{
      id: string;
      title: string;
      kind?: string | null;
      description?: string | null;
      imageUrl?: string | null;
      externalUrl?: string | null;
      startedAt?: Date | string | null;
      endedAt?: Date | string | null;
    }>;
  };
  /** 현재 로그인 사용자가 이 크리에이터의 활성 멤버인지 여부. */
  isActiveMember?: boolean;
  /** 멤버십 가입 Server Action — 기존 흐름 재사용(신규 결제 로직 없음). */
  joinAction?: (planId: string) => Promise<void>;
  creatorProfileId: string;
  /** 크리에이터 평점 요약(SPEC-008 FR-012). 누락 시 표시하지 않는다. */
  rating?: { avg: number | null; count: number };
}

type WorkItem = NonNullable<StudioPortfolioIntroProps["studio"]["works"]>[number];
type PlanItem = NonNullable<StudioPortfolioIntroProps["studio"]["plans"]>[number];

export function StudioPortfolioIntro({
  studio,
  isActiveMember = false,
  joinAction,
  creatorProfileId,
  rating,
}: StudioPortfolioIntroProps) {
  const works = studio.works ?? [];
  const programs = studio.programs ?? [];
  const plans = studio.plans ?? [];

  // 스탯은 include 결과의 길이/active 멤버십 합으로 파생한다(추가 DB 호출 없음).
  const stats = [
    { label: "작가 노트", value: studio.posts?.length ?? 0 },
    {
      label: "후원자",
      value: plans.reduce((sum, plan) => sum + (plan.memberships?.length ?? 0), 0),
    },
    { label: "프로그램", value: programs.length },
  ];

  // 대표 플랜: 최저가(동가일 경우 먼저 로드된 플랜 유지).
  const featuredPlan: PlanItem | null =
    plans.length > 0
      ? plans.reduce((cheapest, plan) => (plan.priceKrw < cheapest.priceKrw ? plan : cheapest), plans[0])
      : null;

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[var(--radius-card)] border border-border-default bg-white p-4 text-center"
          >
            <dt className="text-xs text-text-muted">{stat.label}</dt>
            <dd className="mt-1 font-heading text-xl font-bold text-text-default">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-2">
        <h2 className="font-heading text-base font-semibold text-text-default">작가 소개</h2>
        {studio.bio ? (
          <p className="whitespace-pre-line text-sm leading-6 text-text-muted">{studio.bio}</p>
        ) : (
          <p className="text-sm text-text-muted">작가 소개가 아직 등록되지 않았습니다.</p>
        )}
      </section>

      {rating ? (
        <CreatorRatingSummary
          creatorProfileId={creatorProfileId}
          avg={rating.avg}
          count={rating.count}
        />
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-text-default">작품 갤러리</h2>
          <p className="mt-1 text-sm text-text-muted">
            작가가 지나온 전시, 프로젝트, 작업 과정을 이미지와 기간 중심으로 살펴보세요.
          </p>
        </div>
        {works.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {works.map((work) => (
              <li key={work.id}>
                <WorkCard work={work} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">아직 등록된 작품이 없습니다.</p>
        )}
      </section>

      {programs.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-base font-semibold text-text-default">진행 중인 프로그램</h2>
          <ProgramCardList programs={programs} />
        </section>
      ) : null}

      {featuredPlan ? (
        <section className="rounded-[var(--radius-card)] border border-border-default bg-brand-subtle p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="font-heading text-base font-semibold text-text-default">멤버십으로 더 가까이</p>
              <p className="text-sm text-text-muted">
                <span className="font-medium text-text-default">{featuredPlan.title}</span>
                {" · "}
                <span className="font-bold text-brand-primary">{formatKrw(featuredPlan.priceKrw)}</span>
                {" 부터"}
              </p>
            </div>
            <div className="shrink-0">
              {isActiveMember ? (
                <Button size="sm" disabled>
                  멤버십 가입 완료
                </Button>
              ) : creatorProfileId ? (
                <Link
                  href={`/creators/${creatorProfileId}/memberships/${featuredPlan.id}/checkout`}
                  className={buttonVariants({ size: "sm" })}
                >
                  멤버십 참여하기
                </Link>
              ) : joinAction ? (
                <form action={joinAction.bind(null, featuredPlan.id)}>
                  <Button type="submit" size="sm">
                    멤버십 참여하기
                  </Button>
                </form>
              ) : (
                <Button size="sm">멤버십 참여하기</Button>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function WorkCard({ work }: { work: WorkItem }) {
  const period = formatWorkPeriod(work.startedAt, work.endedAt);
  const card = (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border-default bg-white transition-shadow hover:shadow-card">
      {work.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={work.imageUrl} alt={work.title} className="aspect-[4/3] w-full object-cover" />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-brand-subtle text-sm font-semibold text-brand-primary">
          작업 이미지
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-text-muted">
            {work.kind ?? "작업"}
          </span>
          <span className="text-xs text-text-muted">{period}</span>
        </div>
        <p className="font-medium text-text-default">{work.title}</p>
        {work.description ? (
          <p className="line-clamp-3 text-sm leading-6 text-text-muted">{work.description}</p>
        ) : null}
      </div>
    </div>
  );

  if (work.externalUrl) {
    return (
      <a href={work.externalUrl} target="_blank" rel="noreferrer" className="block h-full">
        {card}
      </a>
    );
  }
  return card;
}

function formatWorkPeriod(startedAt?: Date | string | null, endedAt?: Date | string | null) {
  const start = formatWorkDate(startedAt);
  const end = formatWorkDate(endedAt);
  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} 시작`;
  if (end) return `${end} 종료`;
  return "기간 미등록";
}

function formatWorkDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
  }).format(date);
}
