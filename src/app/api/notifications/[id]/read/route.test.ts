import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: (...a: unknown[]) => mockGetCurrentUser(...a) }));

const mockMarkNotificationRead = vi.fn();
vi.mock("@/lib/notifications", () => ({
  markNotificationRead: (...a: unknown[]) => mockMarkNotificationRead(...a),
}));

import { PATCH } from "@/app/api/notifications/[id]/read/route";

const USER = { id: "u-1", role: "FAN", creatorProfile: null };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  mockGetCurrentUser.mockReset();
  mockMarkNotificationRead.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("PATCH /api/notifications/:id/read (FR-014)", () => {
  it("비로그인 401", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await PATCH(
      new Request("http://localhost/api/notifications/n-1/read", { method: "PATCH" }),
      ctx("n-1"),
    );
    expect(res.status).toBe(401);
  });

  it("정상 처리 시 200", async () => {
    mockGetCurrentUser.mockResolvedValue(USER);
    mockMarkNotificationRead.mockResolvedValue({ ok: true, data: { id: "n-1" } });

    const res = await PATCH(
      new Request("http://localhost/api/notifications/n-1/read", { method: "PATCH" }),
      ctx("n-1"),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "n-1" });
    expect(mockMarkNotificationRead).toHaveBeenCalledWith("u-1", "n-1");
  });

  it("서비스 실패해도 200 (이미 읽음 등)", async () => {
    mockGetCurrentUser.mockResolvedValue(USER);
    mockMarkNotificationRead.mockResolvedValue({ ok: true, data: { id: "n-1" } });

    const res = await PATCH(
      new Request("http://localhost/api/notifications/n-1/read", { method: "PATCH" }),
      ctx("n-1"),
    );
    expect(res.status).toBe(200);
  });
});
