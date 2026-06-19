import { CommunityLockedNotice } from "@/components/community/CommunityLockedNotice";
import { CommunityPostList } from "@/components/community/CommunityPostList";
import { CommunityPostComposer } from "@/components/community/CommunityPostComposer";

/**
 * 커뮤니티 탭 패널 (SPEC-007 FR-002, FR-003, FR-004, AC-001, AC-002).
 * 접근 권한이 없으면 격벽 안내, 있으면 글 목록 + 작성 폼을 렌더링한다.
 */
interface CommunityPanelProps {
  creatorProfileId: string;
  canAccess: boolean;
  posts: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: Date | string;
    author: { id: string; name: string };
  }>;
}

export function CommunityPanel({ creatorProfileId, canAccess, posts }: CommunityPanelProps) {
  if (!canAccess) {
    return <CommunityLockedNotice creatorHref={`/creators/${creatorProfileId}`} />;
  }

  return (
    <div className="space-y-4">
      <CommunityPostComposer creatorProfileId={creatorProfileId} />
      <CommunityPostList posts={posts} />
    </div>
  );
}
