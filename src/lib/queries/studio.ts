import { prisma } from "@/lib/prisma";
import { PUBLIC_PROGRAM_STATUSES } from "@/lib/program-status";

/**
 * 크리에이터 스튜디오 단일 조회 (SPEC-002 FR-011, SPEC-004 FR-012).
 * 단일 findUnique + include 호출로 posts/plans/programs를 한 번에 로드 (NFR-003).
 * 존재하지 않으면 null 반환 → 상세 페이지에서 notFound() 처리.
 * 스튜디오 "클럽" 탭에는 공개 상태(deletedAt IS NULL, status IN 공개)만 노출한다 (SPEC-004 FR-012).
 *
 * @MX:ANCHOR: [AUTO] Public data-access for creator studio detail page
 * @MX:REASON: 3+ callers 예상 (detail page, dashboard summary, API) — fan_in 보호
 */
export async function getCreatorStudio(id: string) {
  return prisma.creatorProfile.findUnique({
    where: { id },
    include: {
      posts: { orderBy: { createdAt: "desc" } },
      plans: true,
      programs: {
        where: { deletedAt: null, status: { in: PUBLIC_PROGRAM_STATUSES } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * 크리에이터 목록 조회 (SPEC-002 FR-002, AC-001).
 * role=CREATOR 사용자의 프로필만, 공개 카드 필드만 선택.
 */
export async function listCreators() {
  return prisma.creatorProfile.findMany({
    where: { user: { role: "CREATOR" } },
    select: {
      id: true,
      studioName: true,
      bio: true,
      profileImageUrl: true,
      category: true,
    },
  });
}
