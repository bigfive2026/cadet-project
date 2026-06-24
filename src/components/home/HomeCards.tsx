import Link from "next/link";
import { Lock, Crown } from "lucide-react";
import type { PostVisibility, ProgramStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatKrw, formatProgramPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { effectiveStatus, PROGRAM_STATUS_LABELS } from "@/lib/program-status";

const creatorGradients = [
  "from-[#21A0AA] to-[#187887]",
  "from-[#4658A8] to-[#293667]",
  "from-[#2D7C8B] to-[#1D5360]",
  "from-[#E5EBFC] to-[#F2E5FA]",
  "from-[#DDF3E9] to-[#F2F9E6]",
  "from-[#F8E9D7] to-[#F8E3DF]",
];

export interface HomeCreatorCardItem {
  id: string;
  studioName: string;
  bio?: string | null;
  profileImageUrl?: string | null;
  category?: string | null;
  avgRating?: number | null;
  reviewCount?: number;
}

export interface HomeProgramCardItem {
  id: string;
  title: string;
  priceKrw: number;
  category?: string | null;
  status: ProgramStatus;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  recruitDeadline?: Date | string | null;
  maxParticipants?: number | null;
  creatorProfile?: {
    id: string;
    studioName: string;
    profileImageUrl?: string | null;
  };
}

export interface HomeLockedPostItem {
  id: string;
  title: string;
  body: string;
  visibility: PostVisibility;
  creatorProfile: {
    id: string;
    studioName: string;
    profileImageUrl?: string | null;
  };
}

export interface HomeMembershipPlanItem {
  id: string;
  title: string;
  description?: string | null;
  priceKrw: number;
  creatorProfile: {
    id: string;
    studioName: string;
    profileImageUrl?: string | null;
  };
  memberships?: Array<{ id: string }>;
}

export function FeatureBannerCard({
  creator,
  index = 0,
}: {
  creator: HomeCreatorCardItem;
  index?: number;
}) {
  return (
    <Link
      href={`/creators/${creator.id}`}
      className="group relative block h-[280px] overflow-hidden rounded-lg shadow-card"
    >
      {creator.profileImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={creator.profileImageUrl}
          alt={creator.studioName}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br",
            creatorGradients[index % creatorGradients.length],
          )}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/65" />
      <Badge className="absolute left-5 top-5 bg-white/20 text-[11px] font-bold uppercase tracking-[0.04em] text-white hover:bg-white/20">
        추천
      </Badge>
      <div className="absolute inset-x-5 bottom-6 space-y-1.5 text-white">
        <h3 className="line-clamp-1 font-heading text-[22px] font-bold leading-7">
          {creator.studioName}
        </h3>
        {creator.bio ? (
          <p className="line-clamp-1 text-sm font-medium leading-5 text-white/85">
            {creator.bio}
          </p>
        ) : creator.category ? (
          <p className="text-sm font-medium leading-5 text-white/85">{creator.category}</p>
        ) : null}
      </div>
    </Link>
  );
}

export function CompactThumbCard({
  creator,
  index = 0,
}: {
  creator: HomeCreatorCardItem;
  index?: number;
}) {
  const meta = [
    creator.reviewCount ? `리뷰 ${creator.reviewCount}개` : null,
    creator.avgRating ? `평점 ${creator.avgRating.toFixed(1)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/creators/${creator.id}`}
      className="group block h-full overflow-hidden rounded-lg border border-border-default bg-white shadow-card"
    >
      {creator.profileImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={creator.profileImageUrl}
          alt={creator.studioName}
          className="h-[150px] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div
          className={cn(
            "h-[150px] w-full bg-gradient-to-r",
            creatorGradients[(index + 3) % creatorGradients.length],
          )}
        />
      )}
      <div className="space-y-1.5 px-4 pb-4 pt-3.5">
        {creator.category ? (
          <p className="line-clamp-1 text-[11px] font-bold leading-4 tracking-[0.02em] text-brand-primary-pressed">
            {creator.category}
          </p>
        ) : null}
        <h3 className="line-clamp-1 font-heading text-base font-bold leading-6 text-text-default">
          {creator.studioName}
        </h3>
        {meta ? <p className="line-clamp-1 text-[13px] font-medium text-text-muted">{meta}</p> : null}
      </div>
    </Link>
  );
}

export function ListRowProgramCard({ program }: { program: HomeProgramCardItem }) {
  const status = effectiveStatus({
    status: program.status,
    recruitDeadline: program.recruitDeadline,
    startDate: program.startDate,
    endDate: program.endDate,
  });
  const period = formatProgramPeriod(program.startDate, program.endDate);
  const meta = [
    period,
    program.maxParticipants ? `정원 ${program.maxParticipants}명` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/programs/${program.id}`}
      className="flex h-[88px] items-center gap-3.5 rounded-lg border border-border-default bg-white py-3 pl-3.5 pr-4 shadow-card transition-colors hover:border-brand-primary/40"
    >
      {program.creatorProfile?.profileImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={program.creatorProfile.profileImageUrl}
          alt={program.creatorProfile.studioName}
          className="size-[60px] shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="size-[60px] shrink-0 rounded-md bg-gradient-to-br from-[#8CC79E] to-[#66B28C]" />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="line-clamp-1 font-heading text-[15px] font-bold leading-5 text-text-default">
          {program.title}
        </h3>
        {meta ? <p className="line-clamp-1 text-[13px] font-medium text-text-muted">{meta}</p> : null}
      </div>
      <div className="shrink-0 text-right font-bold">
        <p className="text-[15px] leading-5 text-text-default">{formatKrw(program.priceKrw)}</p>
        <p className="text-[11px] leading-4 text-program">{PROGRAM_STATUS_LABELS[status]}</p>
      </div>
    </Link>
  );
}

export function LockedPostCard({ post }: { post: HomeLockedPostItem }) {
  const visibilityLabel = post.visibility === "PAID" ? "유료 포스트" : "멤버 전용";

  return (
    <article className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-lg border border-border-default bg-white shadow-card">
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-[#D6EFE1] to-[#BCE5CE] text-text-subtle">
        {post.creatorProfile.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.creatorProfile.profileImageUrl}
            alt={post.creatorProfile.studioName}
            className="h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <Lock className="size-11 text-white drop-shadow" strokeWidth={1.8} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-[18px] py-4">
        <Badge variant="secondary" className="w-full justify-start text-[11px] font-bold uppercase">
          {visibilityLabel}
        </Badge>
        <h3 className="line-clamp-1 pt-1 font-heading text-xl font-bold leading-7 text-text-default">
          {post.title}
        </h3>
        <p className="line-clamp-1 text-[13px] leading-5 text-text-muted">
          {post.creatorProfile.studioName}
        </p>
        <p className="line-clamp-2 text-sm leading-5 text-text-default">{post.body}</p>
      </div>
      <div className="flex h-[62px] items-center justify-between bg-surface-subtle/70 px-[18px] py-3.5">
        <span className="text-sm font-bold text-text-default">{visibilityLabel}</span>
        <Link href={`/posts/${post.id}`} className={buttonVariants({ size: "sm" })}>
          보기
        </Link>
      </div>
    </article>
  );
}

export function MembershipPlanPreviewCard({ plan }: { plan: HomeMembershipPlanItem }) {
  const memberCount = plan.memberships?.length ?? 0;

  return (
    <article className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-lg border border-border-default bg-white shadow-card">
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-[#E7DEF7] to-[#D5C5F0] text-text-subtle">
        {plan.creatorProfile.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={plan.creatorProfile.profileImageUrl}
            alt={plan.creatorProfile.studioName}
            className="h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <Crown className="size-11 text-white drop-shadow" strokeWidth={1.8} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-[18px] py-4">
        <Badge variant="membership" className="w-full justify-start text-[11px] font-bold uppercase">
          멤버십
        </Badge>
        <h3 className="line-clamp-1 pt-1 font-heading text-xl font-bold leading-7 text-text-default">
          {plan.title}
        </h3>
        <p className="line-clamp-1 text-[13px] leading-5 text-text-muted">
          월 {formatKrw(plan.priceKrw)}
        </p>
        {plan.description ? (
          <p className="line-clamp-2 text-sm leading-5 text-text-default">{plan.description}</p>
        ) : (
          <p className="line-clamp-1 text-sm leading-5 text-text-default">
            {plan.creatorProfile.studioName}
          </p>
        )}
      </div>
      <div className="flex h-[62px] items-center justify-between bg-surface-subtle/70 px-[18px] py-3.5">
        <span className="text-sm font-bold text-text-default">
          {memberCount > 0 ? `멤버 ${memberCount}명` : plan.creatorProfile.studioName}
        </span>
        <Link
          href={`/creators/${plan.creatorProfile.id}?tab=membership`}
          className={buttonVariants({ size: "sm" })}
        >
          보기
        </Link>
      </div>
    </article>
  );
}
