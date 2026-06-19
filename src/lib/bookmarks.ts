import { prisma } from "@/lib/prisma";

/**
 * 관심 작가 북마크 서비스 (PRD §7 Bookmark, §13.2 관심 작가 추가 버튼).
 *
 * @@unique([fanId, creatorProfileId])로 중복을 DB 레벨에서 차단한다.
 * 토글은 멱등하게 동작한다(있으면 삭제 → false, 없으면 생성 → true).
 */

export type BookmarkServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 404 | 500; error: string };

/**
 * 팬이 해당 크리에이터를 북마크했는지 여부 (PRD §13.2).
 */
export async function isBookmarked(
  fanId: string,
  creatorProfileId: string,
): Promise<boolean> {
  const bookmark = await prisma.bookmark.findUnique({
    where: {
      fanId_creatorProfileId: { fanId, creatorProfileId },
    },
    select: { id: true },
  });
  return bookmark !== null;
}

/**
 * 북마크 토글 (PRD §13.2).
 * - 대상 크리에이터가 존재해야 한다 (404).
 * - 자기 자신(본인 크리에이터 프로필)은 북마크할 수 없다 (400).
 * - 이미 북마크면 삭제 후 false, 없으면 생성 후 true 반환.
 * - 경합으로 인한 P2002는 이미 북마크된 것으로 간주해 true로 정규화한다.
 */
export async function toggleBookmark(
  fanId: string,
  creatorProfileId: string,
): Promise<BookmarkServiceResult<{ bookmarked: boolean }>> {
  const creator = await prisma.creatorProfile.findUnique({
    where: { id: creatorProfileId },
    select: { userId: true },
  });
  if (!creator) {
    return { ok: false, status: 404, error: "Creator not found" };
  }
  if (creator.userId === fanId) {
    return { ok: false, status: 400, error: "Cannot bookmark own studio" };
  }

  const existing = await prisma.bookmark.findUnique({
    where: {
      fanId_creatorProfileId: { fanId, creatorProfileId },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return { ok: true, data: { bookmarked: false } };
  }

  try {
    await prisma.bookmark.create({
      data: { fanId, creatorProfileId },
    });
    return { ok: true, data: { bookmarked: true } };
  } catch (err) {
    // 경합: 다른 요청이 먼저 생성 → 이미 북마크된 것으로 간주
    if (isUniqueViolation(err)) {
      return { ok: true, data: { bookmarked: true } };
    }
    return { ok: false, status: 500, error: "Bookmark toggle failed" };
  }
}

/**
 * 팬이 북마크한 크리에이터 목록 (PRD §13.2 관심 작가).
 * 크리에이터 카드 필드만 선택해 최신순으로 반환한다.
 */
export async function listMyBookmarks(
  fanId: string,
): Promise<
  Array<{
    id: string;
    studioName: string;
    bio: string | null;
    profileImageUrl: string | null;
    category: string | null;
  }>
> {
  const bookmarks = await prisma.bookmark.findMany({
    where: { fanId },
    include: {
      creatorProfile: {
        select: { id: true, studioName: true, bio: true, profileImageUrl: true, category: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return bookmarks.map((b) => b.creatorProfile);
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "P2002"
  );
}
