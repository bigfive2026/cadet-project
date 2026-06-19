"use client";

import Link from "next/link";

/**
 * 크리에이터 평점 요약 (SPEC-008 FR-011, FR-012, AC-011, AC-012).
 * 평균 평점과 리뷰 수를 표시. 리뷰가 없으면 "리뷰 없음" (AC-012).
 */
export function CreatorRatingSummary({
  creatorProfileId,
  avg,
  count,
}: {
  creatorProfileId: string;
  avg: number | null;
  count: number;
}) {
  return (
    <section className="rounded-md border p-4">
      <h2 className="font-heading text-lg font-semibold">평점</h2>
      {avg != null ? (
        <p className="mt-1 text-sm">
          <span className="text-2xl font-bold">{avg.toFixed(1)}</span>
          <span className="ml-2 text-muted-foreground">/ 5.0 · 리뷰 {count}개</span>
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">리뷰 없음</p>
      )}
      <p className="mt-2">
        <Link
          href={`/creators/${creatorProfileId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          크리에이터 스튜디오 보기
        </Link>
      </p>
    </section>
  );
}

