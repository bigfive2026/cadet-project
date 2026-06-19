import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { signContract } from "@/lib/contracts";
import { signSchema } from "@/lib/validation/contract";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/contracts/:id/sign — 계약 서명 (SPEC-006 FR-003, FR-004, AC-002, AC-003).
 * 비로그인 401 → 검증실패 400(agreed!=true) → 서비스 호출(403/404) → 200.
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

  const parsed = signSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Agreement is required to sign", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { id: contractId } = await params;
  const result = await signContract(
    { userId: user.id, role: user.role, creatorProfileId: user.creatorProfile?.id },
    contractId,
    parsed.data.agreed,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: 200 });
}
