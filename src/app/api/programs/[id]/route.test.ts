import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: (...a: unknown[]) => mockGetCurrentUser(...a) }));

const mockUpdateProgram = vi.fn();
const mockDeleteProgram = vi.fn();
vi.mock("@/lib/programs", () => ({
  updateProgram: (...a: unknown[]) => mockUpdateProgram(...a),
  deleteProgram: (...a: unknown[]) => mockDeleteProgram(...a),
}));

const mockGetDetail = vi.fn();
vi.mock("@/lib/queries/programs", () => ({
  getProgramDetail: (...a: unknown[]) => mockGetDetail(...a),
}));

import { DELETE, GET, PATCH } from "@/app/api/programs/[id]/route";

const CREATOR = { id: "u-A", role: "CREATOR", creatorProfile: { id: "p-A" } };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function patchReq(body: unknown) {
  return new Request("http://localhost/api/programs/p1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockGetCurrentUser.mockReset();
  mockUpdateProgram.mockReset();
  mockDeleteProgram.mockReset();
  mockGetDetail.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("GET /api/programs/:id (FR-004, FR-011, AC-007)", () => {
  it("미존재/삭제 시 404", async () => {
    mockGetDetail.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/programs/p1"), ctx("p1"));
    expect(res.status).toBe(404);
  });

  it("존재하면 200으로 상세 반환", async () => {
    mockGetDetail.mockResolvedValue({ id: "p1", title: "클럽" });
    const res = await GET(new Request("http://localhost/api/programs/p1"), ctx("p1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: "p1" });
  });
});

describe("PATCH /api/programs/:id (FR-006, FR-007, AC-005, AC-009, AC-010)", () => {
  it("비로그인 401", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await PATCH(patchReq({ status: "CLOSED" }), ctx("p1"));
    expect(res.status).toBe(401);
  });

  it("빈 객체(검증 실패)는 400", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    const res = await PATCH(patchReq({}), ctx("p1"));
    expect(res.status).toBe(400);
    expect(mockUpdateProgram).not.toHaveBeenCalled();
  });

  it("서비스가 400(미허용 전이)을 반환하면 400 (AC-009)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    mockUpdateProgram.mockResolvedValue({ ok: false, status: 400, error: "Invalid status transition" });
    const res = await PATCH(patchReq({ status: "RECRUITING" }), ctx("p1"));
    expect(res.status).toBe(400);
  });

  it("서비스가 403(타인)을 반환하면 403 (AC-010)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    mockUpdateProgram.mockResolvedValue({ ok: false, status: 403, error: "not owner" });
    const res = await PATCH(patchReq({ status: "CLOSED" }), ctx("p1"));
    expect(res.status).toBe(403);
  });

  it("정상 갱신 시 200 (AC-005)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    mockUpdateProgram.mockResolvedValue({ ok: true, data: { id: "p1", status: "CLOSED" } });
    const res = await PATCH(patchReq({ status: "CLOSED" }), ctx("p1"));
    expect(res.status).toBe(200);
    expect(mockUpdateProgram).toHaveBeenCalledWith(
      { role: "CREATOR", creatorProfileId: "p-A" },
      "p1",
      { status: "CLOSED" },
    );
  });
});

describe("DELETE /api/programs/:id (FR-008, AC-007)", () => {
  it("비로그인 401", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost/api/programs/p1", { method: "DELETE" }), ctx("p1"));
    expect(res.status).toBe(401);
  });

  it("미존재 시 서비스 404를 반환", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    mockDeleteProgram.mockResolvedValue({ ok: false, status: 404, error: "not found" });
    const res = await DELETE(new Request("http://localhost/api/programs/p1", { method: "DELETE" }), ctx("p1"));
    expect(res.status).toBe(404);
  });

  it("정상 삭제 시 200 { ok: true }", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    mockDeleteProgram.mockResolvedValue({ ok: true, data: { ok: true } });
    const res = await DELETE(new Request("http://localhost/api/programs/p1", { method: "DELETE" }), ctx("p1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
