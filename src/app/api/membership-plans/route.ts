import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { membershipPlanCreateSchema } from "@/lib/validation/membership";

/**
 * POST /api/membership-plans — 멤버십 플랜 생성 (SPEC-003 FR-001, FR-002, AC-009).
 * 인가 흐름:
 *   1. getCurrentUser() null → 401
 *   2. role !== CREATOR → 403
 *   3. creatorProfile 없음 → 403
 *   4. Zod safeParse 실패 → 400
 *   5. prisma.membershipPlan.create → 201
 *
 * @MX:ANCHOR: [AUTO] 멤버십 플랜 생성 API — 크리에이터 전용 공개 API 경계
 * @MX:REASON: 크리에이터 인증 + 소유권 검증이 필요한 보안 경계; fan_in >= 3 예상
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "CREATOR") {
    return NextResponse.json({ error: "Forbidden: CREATOR role required" }, { status: 403 });
  }
  if (!user.creatorProfile) {
    return NextResponse.json({ error: "Forbidden: no creator profile" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = membershipPlanCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { title, priceKrw, description } = parsed.data;

  const plan = await prisma.membershipPlan.create({
    data: {
      title,
      priceKrw,
      creatorProfileId: user.creatorProfile.id,
      ...(description !== undefined ? { description } : {}),
    },
  });
  return NextResponse.json(plan, { status: 201 });
}
