import Link from "next/link";
import { Heart, MessageCircle, Share2, Lock, ImageIcon } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { PostVisibility } from "@prisma/client";

/**
 * 포스트 가시성 배지 라벨 (SPEC-002).
 */
export function visibilityLabel(v: PostVisibility): string {
  switch (v) {
    case "PUBLIC":
      return "공개";
    case "MEMBER_ONLY":
      return "멤버십";
    case "PAID":
      return "유료";
    default:
      return v;
  }
}

const VISIBILITY_VARIANT: Record<PostVisibility, BadgeProps["variant"]> = {
  PUBLIC: "default",
  MEMBER_ONLY: "membership",
  PAID: "warning",
};

export interface PostCardListProps {
  posts: Array<{
    id: string;
    title: string;
    body?: string | null;
    visibility: PostVisibility;
    priceKrw?: number | null;
    createdAt?: Date | string | null;
    _count?: { likes: number; comments: number };
  }>;
  /** 작성 스튜디오명 — 카드 헤더 작성자 표시 */
  studioName: string;
  /** 스튜디오 프로필 이미지(아바타). 없으면 이니셜 표시 */
  profileImageUrl?: string | null;
}

function relativeTime(value?: Date | string | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(date);
}

export function PostCardList({ posts, studioName, profileImageUrl }: PostCardListProps) {
  if (posts.length === 0) {
    return <p className="text-sm text-text-muted">아직 포스트가 없습니다.</p>;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          studioName={studioName}
          profileImageUrl={profileImageUrl}
        />
      ))}
    </ul>
  );
}

function PostCard({
  post,
  studioName,
  profileImageUrl,
}: {
  post: PostCardListProps["posts"][number];
  studioName: string;
  profileImageUrl?: string | null;
}) {
  const likeCount = post._count?.likes ?? 0;
  const commentCount = post._count?.comments ?? 0;

  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border-default bg-white p-5 shadow-card">
      {/* 작성자 헤더 */}
      <div className="flex items-center gap-2.5">
        {profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profileImageUrl}
            alt={studioName}
            className="size-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-sm font-bold text-brand-primary">
            {studioName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-text-default">{studioName}</span>
            {post.visibility !== "PUBLIC" ? (
              <Badge variant={VISIBILITY_VARIANT[post.visibility]} className="px-1.5 py-0 text-[11px]">
                {visibilityLabel(post.visibility)}
              </Badge>
            ) : null}
          </div>
          <span className="text-xs text-text-muted">{relativeTime(post.createdAt)}</span>
        </div>
      </div>

      {/* 제목 + 본문/티저 */}
      <div className="space-y-1.5">
        <Link href={`/posts/${post.id}`} className="block">
          <h3 className="line-clamp-2 font-heading text-base font-bold leading-snug text-text-default transition-colors hover:text-brand-primary">
            {post.title}
          </h3>
        </Link>
        <p className="line-clamp-2 text-sm leading-5 text-text-muted">
          {post.visibility === "MEMBER_ONLY"
            ? "이 포스트의 전체 내용은 멤버십 회원에게만 공개됩니다."
            : post.visibility === "PAID"
              ? "이 포스트의 전체 내용은 구매자에게만 공개됩니다."
              : post.body ?? ""}
        </p>
      </div>

      {/* 콘텐츠 영역: 공개=미디어 / 멤버십=잠금 / 유료=결제 */}
      <PostBodyArea post={post} />

      {/* 소셜 푸터 — 실제 좋아요/댓글 수 */}
      <div className="mt-auto flex items-center gap-4 border-t border-border-default pt-3 text-sm text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Heart className="size-4" />
          좋아요 {likeCount}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="size-4" />
          댓글 {commentCount}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Share2 className="size-4" />
          공유
        </span>
      </div>
    </li>
  );
}

function PostBodyArea({ post }: { post: PostCardListProps["posts"][number] }) {
  if (post.visibility === "MEMBER_ONLY") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border-strong bg-surface-subtle px-4 py-8 text-center">
        <Lock className="size-5 text-text-muted" />
        <p className="text-sm font-semibold text-text-default">멤버십 전용 콘텐츠입니다</p>
        <p className="text-xs text-text-muted">멤버십에 가입하면 모든 포스트를 볼 수 있어요</p>
        <Link
          href={`/posts/${post.id}`}
          className="mt-1 rounded-[var(--radius-control)] bg-brand-primary px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-pressed"
        >
          멤버십 가입
        </Link>
      </div>
    );
  }

  if (post.visibility === "PAID") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-control)] border border-dashed border-border-strong bg-surface-subtle px-4 py-8 text-center">
        <p className="text-sm font-semibold text-text-default">
          유료 콘텐츠 · ₩{(post.priceKrw ?? 0).toLocaleString("ko-KR")}
        </p>
        <p className="text-xs text-text-muted">구매 후 바로 열람할 수 있어요</p>
        <Link
          href={`/posts/${post.id}`}
          className="mt-1 rounded-[var(--radius-control)] bg-brand-primary px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-primary-pressed"
        >
          구매하기
        </Link>
      </div>
    );
  }

  // PUBLIC — 미디어 자리(이미지 미보유 시 플레이스홀더)
  return (
    <Link
      href={`/posts/${post.id}`}
      className="flex aspect-[16/9] w-full items-center justify-center rounded-[var(--radius-control)] bg-brand-subtle text-brand-primary/50"
      aria-label="포스트 이미지"
    >
      <ImageIcon className="size-7" />
    </Link>
  );
}
