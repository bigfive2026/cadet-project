import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteProgram, updateProgram } from "@/lib/programs";
import { getProgramDetail } from "@/lib/queries/programs";
import { programUpdateSchema } from "@/lib/validation/program";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/programs/:id — 공개 상세 (SPEC-004 FR-004, FR-011, AC-007).
 * 존재하지 않거나 soft-delete면 404.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const program = await getProgramDetail(id);
  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }
  return NextResponse.json(program, { status: 200 });
}

/**
 * PATCH /api/programs/:id — 수정 (SPEC-004 FR-006, FR-007, AC-005, AC-009, AC-010).
 * 비로그인 401 → 비크리에이터 403 → 미존재/삭제 404 → 타인 403 → 검증실패/미허용전이 400 → 200.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
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

  const parsed = programUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await updateProgram(
    { role: user.role, creatorProfileId: user.creatorProfile?.id },
    id,
    parsed.data,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: 200 });
}

/**
 * DELETE /api/programs/:id — soft delete (SPEC-004 FR-008, AC-007).
 * 비로그인 401 → 비크리에이터 403 → 미존재/삭제 404 → 타인 403 → 200 { ok: true }.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await deleteProgram(
    { role: user.role, creatorProfileId: user.creatorProfile?.id },
    id,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: 200 });
}
