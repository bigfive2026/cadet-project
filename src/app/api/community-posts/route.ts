import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canAccessCommunity } from "@/lib/community-access";
import { communityPostCreateSchema } from "@/lib/validation/community-post";

/**
 * POST /api/community-posts — 커뮤니티 글 생성 (SPEC-007 FR-004, FR-005, AC-004, AC-005).
 * 인가 흐름:
 *   1. getCurrentUser() null → 401
 *   2. JSON 파싱 실패 → 400
 *   3. Zod safeParse 실패 → 400
 *   4. canAccessCommunity false → 403 (비권한)
 *   5. prisma.communityPost.create → 201
 *
 * @MX:ANCHOR: [AUTO] 커뮤니티 글 생성 API — 권한 사용자 전용 공개 경계
 * @MX:REASON: 멤버/참여자 접근 검증이 필요한 보안 경계
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

  const parsed = communityPostCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { creatorProfileId, title, content } = parsed.data;

  const allowed = await canAccessCommunity(user.id, creatorProfileId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Forbidden: community access required" },
      { status: 403 },
    );
  }

  const post = await prisma.communityPost.create({
    data: { creatorProfileId, authorId: user.id, title, content },
  });
  return NextResponse.json(post, { status: 201 });
}
