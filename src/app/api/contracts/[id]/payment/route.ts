import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { startPayment } from "@/lib/contracts";
import { paymentSchema } from "@/lib/validation/contract";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/contracts/:id/payment — Mock 결제 시작 (SPEC-006 FR-007, FR-008, AC-004, AC-005).
 * 비로그인 401 → 검증실패 400 → 서비스 호출(400/403/404/409/500) → 200.
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

  const parsed = paymentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { id: contractId } = await params;
  const result = await startPayment(
    { userId: user.id, role: user.role, creatorProfileId: user.creatorProfile?.id },
    contractId,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: 200 });
}
