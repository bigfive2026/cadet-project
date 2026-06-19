import { prisma } from "@/lib/prisma";

/**
 * 리뷰 조회(read) 쿼리 (SPEC-008 FR-011, FR-012, AC-010~AC-012).
 */

export type ProgramReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  user: { id: string; name: string };
};

/**
 * 프로그램 리뷰 목록 + 평균 평점 (FR-011, AC-010).
 * 리뷰가 없으면 빈 배열과 avg=null을 반환한다 (AC-012).
 */
export async function listProgramReviews(
  programId: string,
): Promise<{ reviews: ProgramReviewItem[]; avgRating: number | null }> {
  const reviews = await prisma.review.findMany({
    where: { programId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const avgRating = reviews.length
    ? Math.round(
        (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10,
      ) / 10
    : null;

  return { reviews, avgRating };
}

/**
 * 크리에이터의 평균 평점과 리뷰 수 (FR-012, AC-011, AC-012).
 * 크리에이터가 소유한 모든 프로그램의 리뷰를 집계한다.
 * 리뷰가 없으면 { avg: null, count: 0 }.
 */
export async function getCreatorRating(
  creatorProfileId: string,
): Promise<{ avg: number | null; count: number }> {
  const agg = await prisma.review.aggregate({
    where: { program: { creatorProfileId } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const avg =
    agg._avg.rating != null ? Math.round(agg._avg.rating * 10) / 10 : null;
  return { avg, count: agg._count.rating };
}

/**
 * 리뷰 작성 자격 판정 (SPEC-008 FR-005, FR-009, FR-006; UI 표시용).
 * - canReview: 결제 완료(ACCEPTED + PAID|RELEASED) 참여자.
 * - alreadyReviewed: 이미 리뷰를 작성했는지 여부 (1인 1회).
 * 비로그인(user=null)이면 둘 다 false.
 */
export async function getReviewEligibility(
  programId: string,
  userId: string | null,
): Promise<{ canReview: boolean; alreadyReviewed: boolean }> {
  if (!userId) return { canReview: false, alreadyReviewed: false };

  const [paid, existing] = await Promise.all([
    prisma.payment.findFirst({
      where: {
        fanUserId: userId,
        status: { in: ["PAID", "RELEASED"] },
        contract: { application: { programId, status: "ACCEPTED" } },
      },
      select: { id: true },
    }),
    prisma.review.findFirst({
      where: { programId, userId },
      select: { id: true },
    }),
  ]);

  return { canReview: !!paid, alreadyReviewed: !!existing };
}
