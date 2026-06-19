import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createReview } from "@/lib/reviews";
import { listProgramReviews } from "@/lib/queries/reviews";
import { reviewSchema } from "@/lib/validation/review";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/programs/:id/reviews — 프로그램 리뷰 목록 + 평균 평점 (SPEC-008 FR-011, AC-010).
 * 공개 조회. 미존재 프로그램은 빈 목록을 반환한다 (404는 상세 페이지 라우트에서 처리).
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const { reviews, avgRating } = await listProgramReviews(id);
  return NextResponse.json({ reviews, avgRating }, { status: 200 });
}

/**
 * POST /api/programs/:id/reviews — 리뷰 작성 (SPEC-008 FR-005~FR-010, AC-005~AC-009).
 * 비로그인 401 → 검증실패 400 → 서비스 호출(400/403/404/409/500) → 201.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = reviewSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await createReview(
    { userId: user.id, role: user.role, creatorProfileId: user.creatorProfile?.id },
    id,
    parsed.data,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: 201 });
}
