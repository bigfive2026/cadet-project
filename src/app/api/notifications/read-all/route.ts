import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { markAllNotificationsRead } from "@/lib/notifications";

/**
 * PATCH /api/notifications/read-all — 전체 알림 읽음 표시 (SPEC-005 FR-014, AC-009).
 * 비로그인 401 → 200 with count.
 */
export async function PATCH(_request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await markAllNotificationsRead(user.id);

  return NextResponse.json({ count }, { status: 200 });
}
