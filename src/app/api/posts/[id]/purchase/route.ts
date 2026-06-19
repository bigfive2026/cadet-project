import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { purchasePost } from "@/lib/post-purchase";
import { purchaseSchema } from "@/lib/validation/post-purchase";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/posts/:id/purchase — PAID 포스트 단건 구매 (SPEC-009 FR-003, FR-009).
 * 비로그인 401(FR-009) → 검증 실패 400 → 서비스 호출(400/404/409/500) → 200.
 * 본문은 선택값이며 누락 시 provider=mock으로 처리한다.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 본문은 선택값 — 비어 있으면 기본값(mock)으로 처리한다.
  let json: unknown = {};
  try {
    const text = await request.text();
    if (text) json = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = purchaseSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { id: postId } = await params;
  const result = await purchasePost({ userId: user.id }, postId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: 200 });
}
