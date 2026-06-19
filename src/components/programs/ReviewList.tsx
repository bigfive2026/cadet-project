import type { ProgramReviewItem } from "@/lib/queries/reviews";

/**
 * 프로그램 리뷰 목록 + 평균 평점 표시 (SPEC-008 FR-011, FR-012, AC-010, AC-012).
 * 리뷰가 없으면 "아직 리뷰가 없습니다"를 표시한다 (AC-012).
 */
export function ReviewList({
  reviews,
  avgRating,
}: {
  reviews: ProgramReviewItem[];
  avgRating: number | null;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h2 className="font-heading text-lg font-semibold">리뷰</h2>
        {avgRating != null ? (
          <span className="text-sm text-muted-foreground">
            평균 평점 <span className="font-medium text-foreground">{avgRating.toFixed(1)}</span>
            {" "}· {reviews.length}개
          </span>
        ) : null}
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 리뷰가 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{review.user.name}</span>
                <span className="text-sm">{"★".repeat(review.rating)}</span>
              </div>
              {review.comment ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {review.comment}
                </p>
              ) : null}
              {review.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {review.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
