import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createProgram } from "@/lib/programs";
import { listPublicPrograms } from "@/lib/queries/programs";
import { programCreateSchema } from "@/lib/validation/program";

/**
 * GET /api/programs — 공개 프로그램 목록 (SPEC-004 FR-003).
 * 쿼리: category? → 공개 상태 + deletedAt IS NULL 목록.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;
  const programs = await listPublicPrograms({ category });
  return NextResponse.json(programs, { status: 200 });
}

/**
 * POST /api/programs — 프로그램 생성 (SPEC-004 FR-001, FR-002, AC-001, AC-004).
 * 인가 흐름: 비로그인 401 → 비크리에이터/프로필없음 403 → 검증실패 400 → 생성 201.
 *
 * @MX:ANCHOR: [AUTO] 프로그램 생성 API — 크리에이터 전용 공개 API 경계
 * @MX:REASON: 크리에이터 인증 + 본인 프로필 연결이 필요한 보안 경계 (NFR-002)
 */
export async function POST(request: Request) {
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

  const parsed = programCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await createProgram(
    { role: user.role, creatorProfileId: user.creatorProfile?.id },
    parsed.data,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data, { status: 201 });
}
