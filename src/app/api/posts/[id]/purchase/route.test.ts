import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- purchasePost mock ---
const mockPurchasePost = vi.fn();
vi.mock("@/lib/post-purchase", () => ({
  purchasePost: (...args: unknown[]) => mockPurchasePost(...args),
}));

// --- getCurrentUser mock ---
const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

import { POST } from "@/app/api/posts/[id]/purchase/route";

const FAN_USER = { id: "u-fan", role: "FAN", creatorProfile: null };

function makeReq(body?: unknown) {
  return new Request("http://localhost/api/posts/post-1/purchase", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const ctx = { params: Promise.resolve({ id: "post-1" }) };

beforeEach(() => {
  mockPurchasePost.mockReset();
  mockGetCurrentUser.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("POST /api/posts/:id/purchase (FR-003, FR-009)", () => {
  it("비로그인 시 401을 반환하고 서비스를 호출하지 않는다 (FR-009, AC-009)", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(401);
    expect(mockPurchasePost).not.toHaveBeenCalled();
  });

  it("구매 성공 시 200과 결제 데이터를 반환한다 (AC-002)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    mockPurchasePost.mockResolvedValue({
      ok: true,
      data: { paymentId: "pay-1", settlementId: "set-1", amount: 5000, feeKrw: 500 },
    });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.paymentId).toBe("pay-1");
    expect(mockPurchasePost).toHaveBeenCalledWith({ userId: "u-fan" }, "post-1");
  });

  it("서비스가 409를 반환하면 409로 매핑한다 (FR-005, AC-004)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    mockPurchasePost.mockResolvedValue({ ok: false, status: 409, error: "Post already purchased" });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(409);
  });

  it("서비스가 400을 반환하면 400으로 매핑한다 (FR-004, AC-008)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    mockPurchasePost.mockResolvedValue({ ok: false, status: 400, error: "PAID post must have a positive price" });
    const res = await POST(makeReq(), ctx);
    expect(res.status).toBe(400);
  });

  it("잘못된 JSON 본문은 400을 반환한다", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    const req = new Request("http://localhost/api/posts/post-1/purchase", {
      method: "POST",
      body: "{ not json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    expect(mockPurchasePost).not.toHaveBeenCalled();
  });
});
