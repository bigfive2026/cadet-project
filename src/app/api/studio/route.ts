import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { studioUpdateSchema } from "@/lib/validation/studio";

/**
 * PATCH /api/studio — 크리에이터 스튜디오 정보 편집 (SPEC-002 FR-006, AC-005, AC-006).
 * 인가 흐름 (NFR-002):
 *   1. getCurrentUser() null → 401
 *   2. role !== CREATOR → 403
 *   3. Zod safeParse 실패 → 400
 *   4. user.creatorProfile.id !== body.creatorProfileId → 403 (AC-006 CORE)
 *   5. prisma.creatorProfile.update → 200 + 갱신된 프로필
 *
 * @MX:ANCHOR: [AUTO] Public API surface for studio edits — Authorization is critical
 * @MX:REASON: AC-006 core security invariant — owner check before DB write
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "CREATOR") {
    return NextResponse.json({ error: "Forbidden: CREATOR role required" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = studioUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const body = parsed.data;
  if (user.creatorProfile?.id !== body.creatorProfileId) {
    return NextResponse.json(
      { error: "Forbidden: you do not own this studio profile" },
      { status: 403 },
    );
  }

  // 빈 문자열 → null: URL 필드 해제(clear)를 허용한다. 스키마는 모두 String? 이다.
  const data: Record<string, unknown> = {};
  if (body.studioName !== undefined) data.studioName = body.studioName;
  if (body.bio !== undefined) data.bio = body.bio;
  if (body.category !== undefined) data.category = body.category;
  if (body.coverImageUrl !== undefined)
    data.coverImageUrl = body.coverImageUrl === "" ? null : body.coverImageUrl;
  if (body.profileImageUrl !== undefined)
    data.profileImageUrl = body.profileImageUrl === "" ? null : body.profileImageUrl;
  if (body.instagramUrl !== undefined)
    data.instagramUrl = body.instagramUrl === "" ? null : body.instagramUrl;
  if (body.websiteUrl !== undefined)
    data.websiteUrl = body.websiteUrl === "" ? null : body.websiteUrl;

  const updated = await prisma.creatorProfile.update({
    where: { id: body.creatorProfileId },
    data,
  });

  return NextResponse.json(updated, { status: 200 });
}
