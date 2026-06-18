/**
 * 잠금 상태 포스트 프리뷰 컴포넌트 (SPEC-003 FR-009, FR-011, AC-001).
 * [NFR-002] body는 절대 이 컴포넌트에 전달하지 않는다 — 서버 컴포넌트에서 접근 거부 시 body를 제외한다.
 */
export interface LockedPostPreviewProps {
  title: string;
  creatorId: string;
  isPaid?: boolean;
}

export function LockedPostPreview({ title, creatorId, isPaid = false }: LockedPostPreviewProps) {
  return (
    <article className="space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      {isPaid && (
        <span className="inline-block rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
          유료 콘텐츠
        </span>
      )}
      <div className="rounded-lg border border-dashed p-8 text-center space-y-4">
        <p className="text-muted-foreground">
          {isPaid
            ? "유료 콘텐츠입니다. 구매 후 열람할 수 있습니다."
            : "멤버 전용 콘텐츠입니다. 멤버십에 가입하면 열람할 수 있습니다."}
        </p>
        {!isPaid && (
          <a
            href={`/creators/${creatorId}`}
            className="inline-block rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            멤버십 가입하기
          </a>
        )}
      </div>
    </article>
  );
}
