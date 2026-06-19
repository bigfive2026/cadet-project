import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    creatorProfile: {
      findUnique: vi.fn(),
    },
    bookmark: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { isBookmarked, toggleBookmark, listMyBookmarks } from "./bookmarks";

const FAN_ID = "fan-1";
const CREATOR_PROFILE_ID = "cprof-1";
const OTHER_FAN_ID = "fan-2";

beforeEach(() => {
  Object.values(mockPrisma).forEach((m) => {
    Object.values(m as Record<string, ReturnType<typeof vi.fn>>).forEach((fn) =>
      fn.mockReset(),
    );
  });
});

describe("isBookmarked", () => {
  it("북마크 레코드가 있으면 true", async () => {
    mockPrisma.bookmark.findUnique.mockResolvedValue({ id: "bm-1" });
    await expect(isBookmarked(FAN_ID, CREATOR_PROFILE_ID)).resolves.toBe(true);
  });

  it("북마크 레코드가 없으면 false", async () => {
    mockPrisma.bookmark.findUnique.mockResolvedValue(null);
    await expect(isBookmarked(FAN_ID, CREATOR_PROFILE_ID)).resolves.toBe(false);
  });
});

describe("toggleBookmark", () => {
  it("미존재 크리에이터면 404", async () => {
    mockPrisma.creatorProfile.findUnique.mockResolvedValue(null);
    const result = await toggleBookmark(FAN_ID, CREATOR_PROFILE_ID);
    expect(result).toEqual({ ok: false, status: 404, error: "Creator not found" });
  });

  it("본인 크리에이터 프로필은 북마크 불가 → 400", async () => {
    mockPrisma.creatorProfile.findUnique.mockResolvedValue({ userId: FAN_ID });
    const result = await toggleBookmark(FAN_ID, CREATOR_PROFILE_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("북마크가 없으면 생성하고 bookmarked: true", async () => {
    mockPrisma.creatorProfile.findUnique.mockResolvedValue({ userId: "creator-user" });
    mockPrisma.bookmark.findUnique.mockResolvedValue(null);
    mockPrisma.bookmark.create.mockResolvedValue({ id: "bm-1" });

    const result = await toggleBookmark(FAN_ID, CREATOR_PROFILE_ID);
    expect(result).toEqual({ ok: true, data: { bookmarked: true } });
    expect(mockPrisma.bookmark.create).toHaveBeenCalledWith({
      data: { fanId: FAN_ID, creatorProfileId: CREATOR_PROFILE_ID },
    });
    expect(mockPrisma.bookmark.delete).not.toHaveBeenCalled();
  });

  it("북마크가 있으면 삭제하고 bookmarked: false", async () => {
    mockPrisma.creatorProfile.findUnique.mockResolvedValue({ userId: "creator-user" });
    mockPrisma.bookmark.findUnique.mockResolvedValue({ id: "bm-1" });
    mockPrisma.bookmark.delete.mockResolvedValue({ id: "bm-1" });

    const result = await toggleBookmark(FAN_ID, CREATOR_PROFILE_ID);
    expect(result).toEqual({ ok: true, data: { bookmarked: false } });
    expect(mockPrisma.bookmark.delete).toHaveBeenCalledWith({ where: { id: "bm-1" } });
    expect(mockPrisma.bookmark.create).not.toHaveBeenCalled();
  });

  it("생성 중 P2002(경합)는 bookmarked: true로 정규화", async () => {
    mockPrisma.creatorProfile.findUnique.mockResolvedValue({ userId: "creator-user" });
    mockPrisma.bookmark.findUnique.mockResolvedValue(null);
    mockPrisma.bookmark.create.mockRejectedValue(
      Object.assign(new Error("unique"), { code: "P2002" }),
    );

    const result = await toggleBookmark(FAN_ID, CREATOR_PROFILE_ID);
    expect(result).toEqual({ ok: true, data: { bookmarked: true } });
  });
});

describe("listMyBookmarks", () => {
  it("북마크한 크리에이터 카드 필드를 최신순으로 반환한다", async () => {
    mockPrisma.bookmark.findMany.mockResolvedValue([
      {
        creatorProfile: {
          id: CREATOR_PROFILE_ID,
          studioName: "신진작가",
          bio: "소개",
          profileImageUrl: null,
          category: "일러스트",
        },
      },
      {
        creatorProfile: {
          id: "cprof-2",
          studioName: "조각공방",
          bio: null,
          profileImageUrl: null,
          category: null,
        },
      },
    ]);

    const result = await listMyBookmarks(OTHER_FAN_ID);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: CREATOR_PROFILE_ID,
      studioName: "신진작가",
      bio: "소개",
      profileImageUrl: null,
      category: "일러스트",
    });
  });

  it("북마크가 없으면 빈 배열", async () => {
    mockPrisma.bookmark.findMany.mockResolvedValue([]);
    await expect(listMyBookmarks(OTHER_FAN_ID)).resolves.toEqual([]);
  });
});
