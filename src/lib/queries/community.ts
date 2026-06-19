import { prisma } from "@/lib/prisma";

/**
 * 커뮤니티 글 목록 조회 (SPEC-007 FR-003, AC-002, AC-004).
 * 해당 크리에이터의 CommunityPost를 최신순으로 author 이름과 함께 로드한다.
 */
export function listCommunityPosts(creatorProfileId: string) {
  return prisma.communityPost.findMany({
    where: { creatorProfileId },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true } },
    },
  });
}
