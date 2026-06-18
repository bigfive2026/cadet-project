import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Prisma mock ---
const mockCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: { create: (...args: unknown[]) => mockCreate(...args) },
  },
}));

// --- getCurrentUser mock ---
const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

import { POST } from "@/app/api/posts/route";

const CREATOR_USER = {
  id: "u-creator",
  role: "CREATOR",
  creatorProfile: { id: "p-creator", studioName: "스튜디오", bio: null },
};
const FAN_USER = { id: "u-fan", role: "FAN", creatorProfile: null };

function makeReq(body: unknown) {
  return new Request("http://localhost/api/posts", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockCreate.mockReset();
  mockGetCurrentUser.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("POST /api/posts (FR-012, FR-013, AC-006, AC-007)", () => {
  it("비로그인 시 401을 반환한다", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(makeReq({ title: "제목", body: "내용", visibility: "PUBLIC" }));
    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("비크리에이터(FAN) 요청 시 403을 반환한다", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    const res = await POST(makeReq({ title: "제목", body: "내용", visibility: "PUBLIC" }));
    expect(res.status).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("PAID 포스트에서 priceKrw 없으면 400 반환 (AC-007)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR_USER);
    const res = await POST(makeReq({ title: "유료", body: "내용", visibility: "PAID" }));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("PAID 포스트에서 priceKrw=0이면 400 반환 (AC-007)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR_USER);
    const res = await POST(makeReq({ title: "유료", body: "내용", visibility: "PAID", priceKrw: 0 }));
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("PUBLIC 포스트를 생성하고 201을 반환한다 (FR-012)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR_USER);
    const created = { id: "post-1", title: "공개", body: "내용", visibility: "PUBLIC", creatorProfileId: "p-creator" };
    mockCreate.mockResolvedValue(created);

    const res = await POST(makeReq({ title: "공개", body: "내용", visibility: "PUBLIC" }));
    expect(res.status).toBe(201);
    const resBody = await res.json();
    expect(resBody.id).toBe("post-1");
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: "공개", body: "내용", visibility: "PUBLIC", creatorProfileId: "p-creator" }),
    });
  });

  it("PAID 포스트를 priceKrw와 함께 생성하고 201을 반환한다 (AC-006)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR_USER);
    const created = { id: "post-2", title: "유료", body: "내용", visibility: "PAID", priceKrw: 5000, creatorProfileId: "p-creator" };
    mockCreate.mockResolvedValue(created);

    const res = await POST(makeReq({ title: "유료", body: "내용", visibility: "PAID", priceKrw: 5000 }));
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ priceKrw: 5000, visibility: "PAID" }),
    });
  });

  it("MEMBER_ONLY 포스트를 생성한다", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR_USER);
    const created = { id: "post-3", title: "멤버", body: "내용", visibility: "MEMBER_ONLY", creatorProfileId: "p-creator" };
    mockCreate.mockResolvedValue(created);

    const res = await POST(makeReq({ title: "멤버", body: "내용", visibility: "MEMBER_ONLY" }));
    expect(res.status).toBe(201);
  });
});
