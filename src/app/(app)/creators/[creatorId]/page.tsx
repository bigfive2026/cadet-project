import { notFound } from "next/navigation";
import { getCreatorStudio } from "@/lib/queries/studio";
import { getCreatorRating } from "@/lib/queries/reviews";
import { getCurrentUser } from "@/lib/auth";
import { isActiveMember } from "@/lib/membership";
import { canAccessCommunity } from "@/lib/community-access";
import { isBookmarked } from "@/lib/bookmarks";
import { listCommunityPosts } from "@/lib/queries/community";
import { joinMembership } from "@/app/(app)/creators/[creatorId]/actions";
import { StudioTabs } from "@/components/studio/StudioTabs";
import { BookmarkButton } from "@/components/studio/BookmarkButton";

/**
 * 크리에이터 스튜디오 상세 페이지 (SPEC-002 FR-011, SPEC-003 FR-003, FR-006, AC-003,
 * SPEC-007 FR-001, FR-002, FR-003).
 * isActiveMember + canAccessCommunity를 서버에서 계산하여 StudioTabs에 전달한다 (NFR-001, NFR-002).
 * joinAction Server Action을 클라이언트 컴포넌트에 prop으로 전달.
 */
export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ creatorId: string }>;
}) {
  const { creatorId } = await params;
  const [studio, currentUser] = await Promise.all([
    getCreatorStudio(creatorId),
    getCurrentUser(),
  ]);

  if (!studio) {
    notFound();
  }

  // 서버에서 멤버 여부 + 커뮤니티 접근 권한 + 글 목록 + 평점 + 북마크 여부를 병렬로 로드 (NFR-001, NFR-002)
  const [memberStatus, communityAccess, communityPosts, rating, bookmarked] = await Promise.all([
    currentUser ? isActiveMember(currentUser.id, creatorId) : Promise.resolve(false),
    currentUser ? canAccessCommunity(currentUser.id, creatorId) : Promise.resolve(false),
    listCommunityPosts(creatorId),
    getCreatorRating(creatorId),
    currentUser ? isBookmarked(currentUser.id, creatorId) : Promise.resolve(false),
  ]);

  // Server Action: 멤버십 가입 (planId 바인딩)
  async function handleJoin(planId: string): Promise<void> {
    "use server";
    await joinMembership(planId);
  }

  // 북마크 버튼: 팬이고 본인 크리에이터 프로필이 아닐 때만 노출 (PRD §13.2)
  const isOwnStudio =
    currentUser?.role === "CREATOR" && currentUser.creatorProfile?.id === creatorId;
  const headerAction =
    currentUser && currentUser.role === "FAN" && !isOwnStudio ? (
      <BookmarkButton creatorProfileId={creatorId} initialBookmarked={bookmarked} />
    ) : undefined;

  return (
    <StudioTabs
      studio={studio}
      isActiveMember={memberStatus}
      joinAction={handleJoin}
      creatorProfileId={creatorId}
      canAccessCommunity={communityAccess}
      communityPosts={communityPosts}
      rating={rating}
      headerAction={headerAction}
    />
  );
}
