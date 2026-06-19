import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { applyToProgram } from "@/lib/applications";
import { listApplicationsForCreator } from "@/lib/queries/applications";
import { applySchema } from "@/lib/validation/application";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/programs/:id/applications — 프로그램 참여 신청 (SPEC-005 FR-001~FR-004, AC-001~AC-004).
 * 비로그인 401 → 검증실패 400 → 서비스 호출(409/400/404) → 201.
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

  const parsed = applySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { id: programId } = await params;
  const result = await applyToProgram(
    { role: user.role, creatorProfileId: user.creatorProfile?.id },
    programId,
    user.id,
    parsed.data.message,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: 201 });
}

/**
 * GET /api/programs/:id/applications — 크리에이터 본인 신청 목록 (FR-002).
 * 비로그인 401 → 비크리에이터 403 → 200.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "CREATOR") {
    return NextResponse.json({ error: "Forbidden: CREATOR role required" }, { status: 403 });
  }

  const { id: programId } = await params;
  const applications = await listApplicationsForCreator(programId);

  return NextResponse.json(applications, { status: 200 });
}
