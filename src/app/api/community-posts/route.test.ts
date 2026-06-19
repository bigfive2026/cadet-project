import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Prisma mock ---
const mockCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    communityPost: { create: (...args: unknown[]) => mockCreate(...args) },
  },
}));

// --- getCurrentUser mock ---
const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

// --- canAccessCommunity mock ---
const mockCanAccess = vi.fn();
vi.mock("@/lib/community-access", () => ({
  canAccessCommunity: (...args: unknown[]) => mockCanAccess(...args),
}));

import { POST } from "@/app/api/community-posts/route";

const FAN_USER = { id: "u-fan", role: "FAN", creatorProfile: null };

function makeReq(body: unknown) {
  return new Request("http://localhost/api/community-posts", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockCreate.mockReset();
  mockGetCurrentUser.mockReset();
  mockCanAccess.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("POST /api/community-posts (FR-004, FR-005, AC-004, AC-005)", () => {
  it("비로그인 시 401을 반환한다", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(makeReq({ creatorProfileId: "p-1", title: "제목", content: "내용" }));
    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("잘못된 JSON 본문이면 400을 반환한다", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    const res = await POST(makeReq("{ invalid json"));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("필수 필드 누락 시 400을 반환한다", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    const res = await POST(makeReq({ creatorProfileId: "p-1", title: "", content: "" }));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("비권한 사용자가 작성하면 403을 반환하고 글이 생성되지 않는다 (FR-005, AC-005)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    mockCanAccess.mockResolvedValue(false);
    const res = await POST(makeReq({ creatorProfileId: "p-1", title: "제목", content: "내용" }));
    expect(res.status).toBe(403);
    expect(mockCanAccess).toHaveBeenCalledWith("u-fan", "p-1");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("권한 사용자가 작성하면 201을 반환하고 글을 생성한다 (FR-004, AC-004)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    mockCanAccess.mockResolvedValue(true);
    const created = { id: "c-1", title: "안녕하세요", content: "첫 글", authorId: "u-fan", creatorProfileId: "p-1" };
    mockCreate.mockResolvedValue(created);

    const res = await POST(makeReq({ creatorProfileId: "p-1", title: "안녕하세요", content: "첫 글" }));
    expect(res.status).toBe(201);
    const resBody = await res.json();
    expect(resBody.id).toBe("c-1");
    expect(mockCreate).toHaveBeenCalledWith({
      data: { creatorProfileId: "p-1", authorId: "u-fan", title: "안녕하세요", content: "첫 글" },
    });
  });
});
