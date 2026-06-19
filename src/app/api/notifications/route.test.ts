import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: (...a: unknown[]) => mockGetCurrentUser(...a) }));

const mockListNotifications = vi.fn();
vi.mock("@/lib/queries/notifications", () => ({
  listNotifications: (...a: unknown[]) => mockListNotifications(...a),
}));

import { GET } from "@/app/api/notifications/route";

const USER = { id: "u-1", role: "FAN", creatorProfile: null };

beforeEach(() => {
  mockGetCurrentUser.mockReset();
  mockListNotifications.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("GET /api/notifications (FR-014)", () => {
  it("비로그인 401", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/notifications"));
    expect(res.status).toBe(401);
  });

  it("정상 조회 시 200", async () => {
    mockGetCurrentUser.mockResolvedValue(USER);
    // NextResponse.json 직렬화(JSON)를 거치므로 readAt는 ISO 문자열로 비교한다.
    const mockNotifications = [
      { id: "n-1", type: "APPLICATION_CREATED", message: "새로운 신청이 도착했습니다.", readAt: null },
      { id: "n-2", type: "PROGRAM_CLOSED", message: "프로그램 모집이 마감되었습니다.", readAt: "2026-06-18T00:00:00.000Z" },
    ];
    mockListNotifications.mockResolvedValue(mockNotifications);

    const res = await GET(new Request("http://localhost/api/notifications"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockNotifications);
    expect(mockListNotifications).toHaveBeenCalledWith("u-1");
  });

  it("빈 목록도 200", async () => {
    mockGetCurrentUser.mockResolvedValue(USER);
    mockListNotifications.mockResolvedValue([]);

    const res = await GET(new Request("http://localhost/api/notifications"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
