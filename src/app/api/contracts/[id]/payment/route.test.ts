import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: (...a: unknown[]) => mockGetCurrentUser(...a) }));

const mockStartPayment = vi.fn();
vi.mock("@/lib/contracts", () => ({
  startPayment: (...a: unknown[]) => mockStartPayment(...a),
}));

import { POST } from "@/app/api/contracts/[id]/payment/route";

const FAN = { id: "u-1", role: "FAN", creatorProfile: null };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
function req(body?: unknown) {
  return new Request("http://localhost/api/contracts/c1/payment", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockGetCurrentUser.mockReset();
  mockStartPayment.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("POST /api/contracts/:id/payment (SPEC-006 FR-007, FR-008)", () => {
  it("비로그인 401", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(req({}), ctx("c1"));
    expect(res.status).toBe(401);
  });

  it("빈 본문이어도 mock 기본값으로 처리되어 200 (AC-004)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    mockStartPayment.mockResolvedValue({
      ok: true,
      data: { paymentId: "p1", settlementId: "s1", programStatus: "IN_PROGRESS" },
    });
    const res = await POST(req(), ctx("c1"));
    expect(res.status).toBe(200);
    expect(mockStartPayment).toHaveBeenCalledWith(
      { userId: "u-1", role: "FAN", creatorProfileId: undefined },
      "c1",
    );
  });

  it("서비스 409(중복 결제) 반환 시 409 (AC-005)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    mockStartPayment.mockResolvedValue({ ok: false, status: 409, error: "Contract already paid" });
    const res = await POST(req({ provider: "mock" }), ctx("c1"));
    expect(res.status).toBe(409);
  });

  it("서비스 400(서명 전) 반환 시 400 (FR-005)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    mockStartPayment.mockResolvedValue({ ok: false, status: 400, error: "must be signed" });
    const res = await POST(req({}), ctx("c1"));
    expect(res.status).toBe(400);
  });

  it("알 수 없는 provider면 검증 400", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    const res = await POST(req({ provider: "toss" }), ctx("c1"));
    expect(res.status).toBe(400);
    expect(mockStartPayment).not.toHaveBeenCalled();
  });
});
