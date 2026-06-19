import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: (...a: unknown[]) => mockGetCurrentUser(...a) }));

const mockSignContract = vi.fn();
vi.mock("@/lib/contracts", () => ({
  signContract: (...a: unknown[]) => mockSignContract(...a),
}));

import { PATCH } from "@/app/api/contracts/[id]/sign/route";

const FAN = { id: "u-1", role: "FAN", creatorProfile: null };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (body: unknown) =>
  new Request("http://localhost/api/contracts/c1/sign", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  mockGetCurrentUser.mockReset();
  mockSignContract.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("PATCH /api/contracts/:id/sign (SPEC-006 FR-003, FR-004)", () => {
  it("비로그인 401", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await PATCH(req({ agreed: true }), ctx("c1"));
    expect(res.status).toBe(401);
  });

  it("agreed=false면 검증 단계에서 400 (AC-002)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    const res = await PATCH(req({ agreed: false }), ctx("c1"));
    expect(res.status).toBe(400);
    expect(mockSignContract).not.toHaveBeenCalled();
  });

  it("agreed 누락이면 400", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    const res = await PATCH(req({}), ctx("c1"));
    expect(res.status).toBe(400);
  });

  it("agreed=true 성공 시 200 (AC-003)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    const signedAt = new Date();
    mockSignContract.mockResolvedValue({ ok: true, data: { fanSignedAt: signedAt } });
    const res = await PATCH(req({ agreed: true }), ctx("c1"));
    expect(res.status).toBe(200);
    expect(mockSignContract).toHaveBeenCalledWith(
      { userId: "u-1", role: "FAN", creatorProfileId: undefined },
      "c1",
      true,
    );
  });

  it("서비스 403 반환 시 403 (AC-006)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    mockSignContract.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
    const res = await PATCH(req({ agreed: true }), ctx("c1"));
    expect(res.status).toBe(403);
  });
});
