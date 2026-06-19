import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: (...a: unknown[]) => mockGetCurrentUser(...a) }));

const mockProcessApplication = vi.fn();
vi.mock("@/lib/applications", () => ({
  processApplication: (...a: unknown[]) => mockProcessApplication(...a),
}));

import { PATCH } from "@/app/api/applications/[id]/route";

const CREATOR = { id: "u-2", role: "CREATOR", creatorProfile: { id: "cp-1" } };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function patchReq(body: unknown) {
  return new Request("http://localhost/api/applications/app-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockGetCurrentUser.mockReset();
  mockProcessApplication.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("PATCH /api/applications/:id (FR-007~FR-009, AC-010~AC-012)", () => {
  it("비로그인 401", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await PATCH(patchReq({ action: "accept" }), ctx("app-1"));
    expect(res.status).toBe(401);
  });

  it("빈 바디면 400", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    const res = await PATCH(patchReq({}), ctx("app-1"));
    expect(res.status).toBe(400);
  });

  it("잘못된 action이면 400", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    const res = await PATCH(patchReq({ action: "approve" }), ctx("app-1"));
    expect(res.status).toBe(400);
  });

  it("서비스 403(타인프로그램) 반환 시 403 (FR-008, AC-005)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    mockProcessApplication.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Forbidden: not the program owner",
    });

    const res = await PATCH(patchReq({ action: "accept" }), ctx("app-1"));
    expect(res.status).toBe(403);
  });

  it("서비스 400(PENDING아님) 반환 시 400 (FR-009, AC-010)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    mockProcessApplication.mockResolvedValue({
      ok: false,
      status: 400,
      error: "Application is not PENDING",
    });

    const res = await PATCH(patchReq({ action: "accept" }), ctx("app-1"));
    expect(res.status).toBe(400);
  });

  it("accept 성공 시 200 (AC-010)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    mockProcessApplication.mockResolvedValue({
      ok: true,
      data: {
        application: { id: "app-1", status: "ACCEPTED" },
        autoRejectedCount: 0,
      },
    });

    const res = await PATCH(patchReq({ action: "accept" }), ctx("app-1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      application: { id: "app-1", status: "ACCEPTED" },
      autoRejectedCount: 0,
    });
  });

  it("accept + autoRejectOthers true 시 서비스에 전달 (FR-007, AC-011)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    mockProcessApplication.mockResolvedValue({
      ok: true,
      data: {
        application: { id: "app-1", status: "ACCEPTED" },
        autoRejectedCount: 2,
      },
    });

    const res = await PATCH(
      patchReq({ action: "accept", autoRejectOthers: true }),
      ctx("app-1"),
    );
    expect(res.status).toBe(200);
    expect(mockProcessApplication).toHaveBeenCalledWith(
      { role: "CREATOR", creatorProfileId: "cp-1" },
      "app-1",
      "accept",
      true,
    );
  });

  it("reject 성공 시 200 (AC-010)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    mockProcessApplication.mockResolvedValue({
      ok: true,
      data: {
        application: { id: "app-1", status: "REJECTED" },
        autoRejectedCount: 0,
      },
    });

    const res = await PATCH(patchReq({ action: "reject" }), ctx("app-1"));
    expect(res.status).toBe(200);
  });
});
