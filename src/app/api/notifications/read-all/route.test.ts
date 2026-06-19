import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: (...a: unknown[]) => mockGetCurrentUser(...a) }));

const mockMarkAllNotificationsRead = vi.fn();
vi.mock("@/lib/notifications", () => ({
  markAllNotificationsRead: (...a: unknown[]) => mockMarkAllNotificationsRead(...a),
}));

import { PATCH } from "@/app/api/notifications/read-all/route";

const USER = { id: "u-1", role: "FAN", creatorProfile: null };

beforeEach(() => {
  mockGetCurrentUser.mockReset();
  mockMarkAllNotificationsRead.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("PATCH /api/notifications/read-all (FR-014, AC-009)", () => {
  it("비로그인 401", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await PATCH(
      new Request("http://localhost/api/notifications/read-all", { method: "PATCH" }),
    );
    expect(res.status).toBe(401);
  });

  it("정상 처리 시 200 (AC-009)", async () => {
    mockGetCurrentUser.mockResolvedValue(USER);
    mockMarkAllNotificationsRead.mockResolvedValue(3);

    const res = await PATCH(
      new Request("http://localhost/api/notifications/read-all", { method: "PATCH" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ count: 3 });
    expect(mockMarkAllNotificationsRead).toHaveBeenCalledWith("u-1");
  });

  it("읽지 않은 알림이 없어도 200", async () => {
    mockGetCurrentUser.mockResolvedValue(USER);
    mockMarkAllNotificationsRead.mockResolvedValue(0);

    const res = await PATCH(
      new Request("http://localhost/api/notifications/read-all", { method: "PATCH" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ count: 0 });
  });
});
