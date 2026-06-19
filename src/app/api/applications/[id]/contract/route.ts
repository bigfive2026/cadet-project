import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateContract } from "@/lib/contracts";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/applications/:id/contract — 계약 생성/조회 (SPEC-006 FR-001, FR-002, AC-001).
 * 비로그인 401 → 서비스 호출(403/404/400) → 200(계약 id).
 * id는 ProgramApplication.id.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: applicationId } = await params;
  const result = await getOrCreateContract(
    { userId: user.id, role: user.role, creatorProfileId: user.creatorProfile?.id },
    applicationId,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: 200 });
}
