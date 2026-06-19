import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { completeProgram } from "@/lib/reviews";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/programs/:id/complete — 완료 승인 (SPEC-008 FR-001~FR-004, AC-001~AC-004).
 * 비로그인 401 → 서비스 호출(400/403/404/500) → 200.
 * 단일 트랜잭션으로 Program COMPLETED + Payment/Settlement RELEASED + REVIEW_REQUESTED 알림.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await completeProgram(
    { userId: user.id, role: user.role, creatorProfileId: user.creatorProfile?.id },
    id,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: 200 });
}
