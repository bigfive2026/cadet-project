import { formatKrw } from "@/lib/format";
import { PurchaseButton } from "@/components/posts/PurchaseButton";

/**
 * 잠금 상태 포스트 프리뷰 컴포넌트 (SPEC-003 FR-009, FR-011, AC-001; SPEC-009 FR-001).
 * [NFR-002/NFR-004] body는 절대 이 컴포넌트에 전달하지 않는다 — 서버 컴포넌트에서 접근 거부 시 body를 제외한다.
 *
 * PAID 포스트(SPEC-009): "유료 콘텐츠" 라벨 + priceKrw + "구매하기" CTA를 노출한다.
 * MEMBER_ONLY: 멤버십 가입 안내.
 */
export interface LockedPostPreviewProps {
  title: string;
  creatorId: string;
  membershipCheckoutHref?: string;
  isPaid?: boolean;
  /** PAID 포스트일 때 필수 — 구매 CTA에 사용 (SPEC-009 FR-001). */
  postId?: string;
  priceKrw?: number | null;
  isLoggedIn?: boolean;
}

export function LockedPostPreview({
  title,
  creatorId,
  membershipCheckoutHref,
  isPaid = false,
  postId,
  priceKrw,
  isLoggedIn = false,
}: LockedPostPreviewProps) {
  return (
    <article className="space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      {isPaid && (
        <div className="flex items-center gap-2">
          <span className="inline-block rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
            유료 콘텐츠
          </span>
          {priceKrw != null ? (
            <span className="text-sm font-medium text-foreground">{formatKrw(priceKrw)}</span>
          ) : null}
        </div>
      )}
      <div className="space-y-4 rounded-lg border border-dashed p-8 text-center">
        <div
          data-testid="locked-post-blur"
          className="relative overflow-hidden rounded-[var(--radius-card)] border border-border-default bg-surface-subtle/80 p-5"
        >
          <div className="space-y-3 blur-sm" aria-hidden="true">
            <div className="h-5 w-2/3 rounded-full bg-neutral-200" />
            <div className="h-4 w-full rounded-full bg-neutral-100" />
            <div className="h-4 w-11/12 rounded-full bg-neutral-100" />
            <div className="h-32 rounded-[var(--radius-card)] bg-[#d8eeea]" />
          </div>
          <div className="absolute inset-0 bg-white/35" aria-hidden="true" />
        </div>
        <p className="text-muted-foreground">
          {isPaid
            ? "유료 콘텐츠입니다. 구매 후 열람할 수 있습니다."
            : "멤버 전용 콘텐츠입니다. 멤버십에 가입하면 열람할 수 있습니다."}
        </p>
        {isPaid && postId && priceKrw != null ? (
          <div className="flex justify-center">
            <PurchaseButton
              postId={postId}
              title={title}
              priceKrw={priceKrw}
              isLoggedIn={isLoggedIn}
            />
          </div>
        ) : null}
        {!isPaid && (
          <a
            href={membershipCheckoutHref ?? `/creators/${creatorId}?tab=membership`}
            className="inline-block rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            멤버십 가입하기
          </a>
        )}
      </div>
    </article>
  );
}
