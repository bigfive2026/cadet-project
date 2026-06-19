import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: (...a: unknown[]) => mockGetCurrentUser(...a) }));

const mockCreateProgram = vi.fn();
vi.mock("@/lib/programs", () => ({ createProgram: (...a: unknown[]) => mockCreateProgram(...a) }));

const mockListPublic = vi.fn();
vi.mock("@/lib/queries/programs", () => ({
  listPublicPrograms: (...a: unknown[]) => mockListPublic(...a),
}));

import { GET, POST } from "@/app/api/programs/route";

const CREATOR = { id: "u-A", role: "CREATOR", creatorProfile: { id: "p-A" } };
const FAN = { id: "u-f", role: "FAN", creatorProfile: null };

function postReq(body: unknown) {
  return new Request("http://localhost/api/programs", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockGetCurrentUser.mockReset();
  mockCreateProgram.mockReset();
  mockListPublic.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("GET /api/programs (FR-003)", () => {
  it("공개 목록을 200으로 반환한다", async () => {
    mockListPublic.mockResolvedValue([{ id: "p1" }]);
    const res = await GET(new Request("http://localhost/api/programs"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "p1" }]);
  });

  it("category 쿼리를 쿼리 함수에 전달한다", async () => {
    mockListPublic.mockResolvedValue([]);
    await GET(new Request("http://localhost/api/programs?category=클래스"));
    expect(mockListPublic).toHaveBeenCalledWith({ category: "클래스" });
  });
});

describe("POST /api/programs (FR-001, FR-002, AC-001, AC-004)", () => {
  it("비로그인 시 401", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(postReq({ title: "x", priceKrw: 1000 }));
    expect(res.status).toBe(401);
    expect(mockCreateProgram).not.toHaveBeenCalled();
  });

  it("검증 실패(title 없음) 시 400", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    const res = await POST(postReq({ priceKrw: 1000 }));
    expect(res.status).toBe(400);
    expect(mockCreateProgram).not.toHaveBeenCalled();
  });

  it("FAN이면 서비스가 403을 반환 (AC-004)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN);
    mockCreateProgram.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
    const res = await POST(postReq({ title: "x", priceKrw: 1000 }));
    expect(res.status).toBe(403);
  });

  it("크리에이터가 생성하면 201 (AC-001)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR);
    mockCreateProgram.mockResolvedValue({ ok: true, data: { id: "prog-1" } });
    const res = await POST(postReq({ title: "4주 챌린지", priceKrw: 35000, maxParticipants: 20 }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "prog-1" });
    expect(mockCreateProgram).toHaveBeenCalledWith(
      { role: "CREATOR", creatorProfileId: "p-A" },
      expect.objectContaining({ title: "4주 챌린지", priceKrw: 35000 }),
    );
  });
});
