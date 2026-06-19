import type { ProgramStatus } from "@prisma/client";
import type { ProgramReviewItem } from "@/lib/queries/reviews";
import { ReviewList } from "@/components/programs/ReviewList";
import { ReviewForm } from "@/components/programs/ReviewForm";
import { CompleteButton } from "@/components/programs/CompleteButton";

/**
 * 프로그램 리뷰/완료 통합 영역 (SPEC-008 FR-001, FR-005, FR-008, FR-011).
 * - 크리에이터 본인 + IN_PROGRESS: 완료 승인 버튼 (FR-001).
 * - COMPLETED + 결제 완료 참여자: 리뷰 작성 폼 (FR-005, FR-008).
 * - 항상: 리뷰 목록 + 평균 평점 (FR-011, FR-012).
 */
export function ProgramReviewSection({
  programId,
  status,
  owner,
  canReview,
  alreadyReviewed,
  reviews,
  avgRating,
}: {
  programId: string;
  status: ProgramStatus;
  owner: boolean;
  canReview: boolean;
  alreadyReviewed: boolean;
  reviews: ProgramReviewItem[];
  avgRating: number | null;
}) {
  return (
    <div className="space-y-6">
      {owner && status === "IN_PROGRESS" ? (
        <CompleteButton programId={programId} />
      ) : null}

      <ReviewList reviews={reviews} avgRating={avgRating} />

      {status === "COMPLETED" && canReview ? (
        <ReviewForm programId={programId} alreadyReviewed={alreadyReviewed} />
      ) : null}
    </div>
  );
}
