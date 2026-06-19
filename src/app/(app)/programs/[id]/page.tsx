import { notFound } from "next/navigation";
import { getProgramDetail } from "@/lib/queries/programs";
import { listProgramReviews, getReviewEligibility } from "@/lib/queries/reviews";
import { getCurrentUser } from "@/lib/auth";
import { findActiveApplication } from "@/lib/queries/applications";
import { ProgramDetail } from "@/components/programs/ProgramDetail";

/**
 * 공개 프로그램 상세 (SPEC-004 FR-004, FR-011, AC-003, AC-006, AC-007).
 * 존재하지 않거나 soft-delete면 404.
 * SPEC-005: 현재 사용자의 신청 여부와 본인 프로그램 여부를 계산하여 전달.
 */
export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await getProgramDetail(id);
  if (!program) {
    notFound();
  }

  const user = await getCurrentUser();

  // 활성 신청 조회 (SPEC-005 FR-002)
  const activeApplication = user ? await findActiveApplication(id, user.id) : null;
  const applied = !!activeApplication;

  // 본인 프로그램 여부 (SPEC-005)
  const owner = user?.creatorProfile?.id === program.creatorProfile?.id;

  // 리뷰 목록 + 평점 (SPEC-008 FR-011) 및 작성 자격 (FR-005, FR-009)
  const [{ reviews, avgRating }, eligibility] = await Promise.all([
    listProgramReviews(id),
    getReviewEligibility(id, user?.id ?? null),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <ProgramDetail
        program={{
          ...program,
          applied,
          owner,
          review: {
            canReview: eligibility.canReview,
            alreadyReviewed: eligibility.alreadyReviewed,
            reviews,
            avgRating,
          },
        }}
      />
    </div>
  );
}
