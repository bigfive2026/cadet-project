import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: (...a: unknown[]) => mockGetCurrentUser(...a) }));

const mockGetOrCreateContract = vi.fn();
vi.mock("@/lib/contracts", () => ({
  getOrCreateContract: (...a: unknown[]) => mockGetOrCreateContract(...a),
}));

import { POST } from "@/app/api/applications/[id]/contract/route";

const FAN = { id: "u-1", role: "FAN", creatorProfile: null };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => new Request("http://localhost/api/applications/app-1/contract", { method: "POST" });

beforeEach(() => {
  mockGetCurrentUser.mockReset();
  mockGetOrCreateContract.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("POST /api/applications/:id/contract (SPEC-006 FR-001, FR-002)", () => {
  it("비로그인 401", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(req(), ctx("app-1"));
    expect(res.status).toBe(401);
  });

  it("성공 시 200, 계약 id 반환 (AC-001)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    mockGetOrCreateContract.mockResolvedValue({ ok: true, data: { id: "contract-1" } });
    const res = await POST(req(), ctx("app-1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: "contract-1" });
    expect(mockGetOrCreateContract).toHaveBeenCalledWith(
      { userId: "u-1", role: "FAN", creatorProfileId: undefined },
      "app-1",
    );
  });

  it("서비스 403 반환 시 403 (FR-011)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    mockGetOrCreateContract.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
    const res = await POST(req(), ctx("app-1"));
    expect(res.status).toBe(403);
  });

  it("서비스 404 반환 시 404", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    mockGetOrCreateContract.mockResolvedValue({ ok: false, status: 404, error: "Not found" });
    const res = await POST(req(), ctx("app-1"));
    expect(res.status).toBe(404);
  });
});
