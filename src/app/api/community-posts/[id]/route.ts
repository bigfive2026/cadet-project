import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { AppUser } from "@/lib/types";
import { communityPostUpdateSchema } from "@/lib/validation/community-post";

/**
 * 글 수정/삭제 권한 판정 (SPEC-007 FR-006, FR-007).
 * 작성자 본인 OR 해당 스튜디오 소유 크리에이터만 허용한다.
 */
function canManagePost(
  user: AppUser,
  post: { authorId: string; creatorProfileId: string },
): boolean {
  if (post.authorId === user.id) return true;
  if (user.role === "CREATOR" && user.creatorProfile?.id === post.creatorProfileId) {
    return true;
  }
  return false;
}

/**
 * PATCH /api/community-posts/[id] — 커뮤니티 글 수정 (SPEC-007 FR-006, FR-007).
 * 흐름: 401(비로그인) → 404(글 없음) → 403(비권한) → 400(검증 실패) → 200.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const post = await prisma.communityPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canManagePost(user, post)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = communityPostUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const updated = await prisma.communityPost.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(updated, { status: 200 });
}

/**
 * DELETE /api/community-posts/[id] — 커뮤니티 글 삭제 (SPEC-007 FR-006, FR-007, AC-010).
 * 흐름: 401(비로그인) → 404(글 없음) → 403(비권한) → 200.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const post = await prisma.communityPost.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!canManagePost(user, post)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.communityPost.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
