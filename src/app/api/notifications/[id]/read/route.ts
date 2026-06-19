import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { markNotificationRead } from "@/lib/notifications";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/notifications/:id/read — 개별 알림 읽음 표시 (SPEC-005 FR-014).
 * 비로그인 401 → 200.
 */
export async function PATCH(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await markNotificationRead(user.id, id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: 200 });
}
