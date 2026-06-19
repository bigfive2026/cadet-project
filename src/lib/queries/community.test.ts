import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    communityPost: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

import { listCommunityPosts } from "@/lib/queries/community";

beforeEach(() => mockFindMany.mockReset());
afterEach(() => vi.clearAllMocks());

describe("listCommunityPosts (FR-003)", () => {
  it("해당 크리에이터의 글을 최신순으로 author 포함하여 조회한다", async () => {
    const rows = [{ id: "c-1", author: { id: "u-1", name: "팬" } }];
    mockFindMany.mockResolvedValue(rows);

    const result = await listCommunityPosts("p-1");

    expect(result).toEqual(rows);
    expect(mockFindMany).toHaveBeenCalledTimes(1);
    const call = mockFindMany.mock.calls[0][0];
    expect(call.where).toEqual({ creatorProfileId: "p-1" });
    expect(call.orderBy).toEqual({ createdAt: "desc" });
    expect(call.include.author.select).toEqual({ id: true, name: true });
  });

  it("글이 없으면 빈 배열을 반환한다", async () => {
    mockFindMany.mockResolvedValue([]);
    await expect(listCommunityPosts("p-1")).resolves.toEqual([]);
  });
});
