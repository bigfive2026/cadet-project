import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications } from "@/lib/queries/notifications";

/**
 * GET /api/notifications — 사용자 알림 목록 (SPEC-005 FR-014).
 * 비로그인 401 → 200.
 */
export async function GET(_request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await listNotifications(user.id);

  return NextResponse.json(notifications, { status: 200 });
}
