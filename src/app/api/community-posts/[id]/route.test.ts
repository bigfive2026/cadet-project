import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    communityPost: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

import { PATCH, DELETE } from "@/app/api/community-posts/[id]/route";

const AUTHOR = { id: "u-author", role: "FAN", creatorProfile: null };
const OTHER_FAN = { id: "u-other", role: "FAN", creatorProfile: null };
const OWNER_CREATOR = { id: "u-creator", role: "CREATOR", creatorProfile: { id: "p-1" } };
const OTHER_CREATOR = { id: "u-creator2", role: "CREATOR", creatorProfile: { id: "p-2" } };

const POST_ROW = { id: "c-1", authorId: "u-author", creatorProfileId: "p-1", title: "원본", content: "원본 내용" };

function ctx(id = "c-1") {
  return { params: Promise.resolve({ id }) };
}
function patchReq(body: unknown) {
  return new Request("http://localhost/api/community-posts/c-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}
function deleteReq() {
  return new Request("http://localhost/api/community-posts/c-1", { method: "DELETE" });
}

beforeEach(() => {
  mockFindUnique.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
  mockGetCurrentUser.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("PATCH /api/community-posts/[id] (FR-006, FR-007)", () => {
  it("비로그인 시 401을 반환한다", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await PATCH(patchReq({ title: "수정" }), ctx());
    expect(res.status).toBe(401);
  });

  it("존재하지 않는 글이면 404를 반환한다", async () => {
    mockGetCurrentUser.mockResolvedValue(AUTHOR);
    mockFindUnique.mockResolvedValue(null);
    const res = await PATCH(patchReq({ title: "수정" }), ctx());
    expect(res.status).toBe(404);
  });

  it("작성자 본인이 수정하면 200을 반환한다 (FR-006)", async () => {
    mockGetCurrentUser.mockResolvedValue(AUTHOR);
    mockFindUnique.mockResolvedValue(POST_ROW);
    mockUpdate.mockResolvedValue({ ...POST_ROW, title: "수정" });
    const res = await PATCH(patchReq({ title: "수정" }), ctx());
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "c-1" }, data: { title: "수정" } });
  });

  it("소유 크리에이터가 수정하면 200을 반환한다 (FR-006)", async () => {
    mockGetCurrentUser.mockResolvedValue(OWNER_CREATOR);
    mockFindUnique.mockResolvedValue(POST_ROW);
    mockUpdate.mockResolvedValue(POST_ROW);
    const res = await PATCH(patchReq({ content: "크리에이터 수정" }), ctx());
    expect(res.status).toBe(200);
  });

  it("타인(비작성자/비소유)이 수정하면 403을 반환한다 (FR-007)", async () => {
    mockGetCurrentUser.mockResolvedValue(OTHER_FAN);
    mockFindUnique.mockResolvedValue(POST_ROW);
    const res = await PATCH(patchReq({ title: "수정" }), ctx());
    expect(res.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("다른 스튜디오 크리에이터가 수정하면 403을 반환한다 (FR-007)", async () => {
    mockGetCurrentUser.mockResolvedValue(OTHER_CREATOR);
    mockFindUnique.mockResolvedValue(POST_ROW);
    const res = await PATCH(patchReq({ title: "수정" }), ctx());
    expect(res.status).toBe(403);
  });

  it("유효하지 않은 수정 본문이면 400을 반환한다", async () => {
    mockGetCurrentUser.mockResolvedValue(AUTHOR);
    mockFindUnique.mockResolvedValue(POST_ROW);
    const res = await PATCH(patchReq({}), ctx());
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/community-posts/[id] (FR-006, FR-007, AC-010)", () => {
  it("비로그인 시 401을 반환한다", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await DELETE(deleteReq(), ctx());
    expect(res.status).toBe(401);
  });

  it("존재하지 않는 글이면 404를 반환한다", async () => {
    mockGetCurrentUser.mockResolvedValue(AUTHOR);
    mockFindUnique.mockResolvedValue(null);
    const res = await DELETE(deleteReq(), ctx());
    expect(res.status).toBe(404);
  });

  it("작성자 본인이 삭제하면 글이 제거된다 (AC-010)", async () => {
    mockGetCurrentUser.mockResolvedValue(AUTHOR);
    mockFindUnique.mockResolvedValue(POST_ROW);
    mockDelete.mockResolvedValue(POST_ROW);
    const res = await DELETE(deleteReq(), ctx());
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "c-1" } });
  });

  it("소유 크리에이터가 삭제하면 글이 제거된다 (FR-006)", async () => {
    mockGetCurrentUser.mockResolvedValue(OWNER_CREATOR);
    mockFindUnique.mockResolvedValue(POST_ROW);
    mockDelete.mockResolvedValue(POST_ROW);
    const res = await DELETE(deleteReq(), ctx());
    expect(res.status).toBe(200);
  });

  it("타인이 삭제를 시도하면 403을 반환한다 (AC-010)", async () => {
    mockGetCurrentUser.mockResolvedValue(OTHER_FAN);
    mockFindUnique.mockResolvedValue(POST_ROW);
    const res = await DELETE(deleteReq(), ctx());
    expect(res.status).toBe(403);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
