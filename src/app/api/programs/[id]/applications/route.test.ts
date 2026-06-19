import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: (...a: unknown[]) => mockGetCurrentUser(...a) }));

const mockApplyToProgram = vi.fn();
const mockListApplicationsForCreator = vi.fn();
vi.mock("@/lib/applications", () => ({
  applyToProgram: (...a: unknown[]) => mockApplyToProgram(...a),
}));
vi.mock("@/lib/queries/applications", () => ({
  listApplicationsForCreator: (...a: unknown[]) => mockListApplicationsForCreator(...a),
}));

import { POST, GET } from "@/app/api/programs/[id]/applications/route";

const FAN = { id: "u-1", role: "FAN", creatorProfile: null };
const CREATOR = { id: "u-2", role: "CREATOR", creatorProfile: { id: "cp-1" } };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function postReq(body: unknown) {
  return new Request("http://localhost/api/programs/p1/applications", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockGetCurrentUser.mockReset();
  mockApplyToProgram.mockReset();
  mockListApplicationsForCreator.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("POST /api/programs/:id/applications (FR-001~FR-004, AC-001~AC-004)", () => {
  it("비로그인 401", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(postReq({ message: "test" }), ctx("p1"));
    expect(res.status).toBe(401);
  });

  it("빈 바디면 400", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    const res = await POST(postReq(""), ctx("p1"));
    expect(res.status).toBe(400);
  });

  it("message 1000자 초과면 400", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    const res = await POST(postReq({ message: "a".repeat(1001) }), ctx("p1"));
    expect(res.status).toBe(400);
  });

  it("서비스 409(이미신청) 반환 시 409 (FR-002, AC-002)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    mockApplyToProgram.mockResolvedValue({ ok: false, status: 409, error: "Already applied" });

    const res = await POST(postReq({ message: "test" }), ctx("p1"));
    expect(res.status).toBe(409);
  });

  it("서비스 400(모집기간경과) 반환 시 400 (FR-003, AC-002)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    mockApplyToProgram.mockResolvedValue({
      ok: false,
      status: 400,
      error: "Application deadline has passed",
    });

    const res = await POST(postReq({ message: "test" }), ctx("p1"));
    expect(res.status).toBe(400);
  });

  it("CREATOR 역할도 자기 프로그램 신청 시 서비스 400 (FR-004)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    mockApplyToProgram.mockResolvedValue({
      ok: false,
      status: 400,
      error: "Cannot apply to own program as CREATOR role",
    });

    const res = await POST(postReq({ message: "test" }), ctx("p1"));
    expect(res.status).toBe(400);
  });

  it("정상 신청 시 201 (AC-001)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    mockApplyToProgram.mockResolvedValue({ ok: true, data: { id: "app-1" } });

    const res = await POST(postReq({ message: "test" }), ctx("p1"));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "app-1" });
  });
});

describe("GET /api/programs/:id/applications (FR-002)", () => {
  it("비로그인 401", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/programs/p1/applications"), ctx("p1"));
    expect(res.status).toBe(401);
  });

  it("비크리에이터 403", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    const res = await GET(new Request("http://localhost/api/programs/p1/applications"), ctx("p1"));
    expect(res.status).toBe(403);
  });

  it("정상 조회 시 200", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    const mockApplications = [
      { id: "app-1", status: "PENDING", user: { id: "u-1", name: "팬1" } },
    ];
    mockListApplicationsForCreator.mockResolvedValue(mockApplications);

    const res = await GET(new Request("http://localhost/api/programs/p1/applications"), ctx("p1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockApplications);
    expect(mockListApplicationsForCreator).toHaveBeenCalledWith("p1");
  });
});
