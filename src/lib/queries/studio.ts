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
      // 공개 스튜디오에는 발행(PUBLISHED) 포스트만 노출 — 임시저장(DRAFT) 제외.
      posts: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { likes: true, comments: true } } },
      },
      plans: {
        include: {
          memberships: {
            where: { status: "ACTIVE" },
            select: { id: true },
          },
        },
      },
      programs: {
        where: { deletedAt: null, status: { in: PUBLIC_PROGRAM_STATUSES } },
        orderBy: { createdAt: "desc" },
      },
      artworks: {
        where: { status: "PUBLISHED", stock: { gt: 0 } },
        orderBy: { createdAt: "desc" },
      },
      works: {
        orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
      },
    },
  });
}

export function getMembershipPlanForCheckout(creatorProfileId: string, planId: string) {
  return prisma.membershipPlan.findFirst({
    where: {
      id: planId,
      creatorProfileId,
    },
    include: {
      creatorProfile: { select: { id: true, studioName: true } },
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

/**
 * 평점이 높은 크리에이터 상위 N명 (메인 홈 추천용).
 * Review.revieweeId(=크리에이터 userId) 평균 평점 기준 정렬.
 * 리뷰가 없으면 빈 배열을 반환한다.
 */
export async function listTopRatedCreators(limit = 3) {
  const grouped = await prisma.review.groupBy({
    by: ["revieweeId"],
    where: { revieweeId: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
    orderBy: { _avg: { rating: "desc" } },
    take: limit,
  });

  const userIds = grouped
    .map((g) => g.revieweeId)
    .filter((id): id is string => Boolean(id));
  if (userIds.length === 0) return [];

  const profiles = await prisma.creatorProfile.findMany({
    where: { userId: { in: userIds } },
    select: {
      id: true,
      userId: true,
      studioName: true,
      bio: true,
      profileImageUrl: true,
      category: true,
    },
  });

  // 평점 정렬 순서를 유지하며 평균 평점을 부착한다.
  return grouped.flatMap((g) => {
    const profile = profiles.find((p) => p.userId === g.revieweeId);
    if (!profile) return [];
    return [
      {
        ...profile,
        avgRating:
          g._avg.rating != null ? Math.round(g._avg.rating * 10) / 10 : null,
        reviewCount: g._count.rating,
      },
    ];
  });
}

/** 홈 랜딩의 잠금 포스트 섹션용: 멤버/유료 공개 포스트를 최신순으로 조회한다. */
export function listLockedPosts(limit = 3) {
  return prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      visibility: { in: ["MEMBER_ONLY", "PAID"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      body: true,
      visibility: true,
      creatorProfile: {
        select: {
          id: true,
          studioName: true,
          profileImageUrl: true,
        },
      },
    },
  });
}

/** 홈 랜딩의 인기 멤버십 섹션용: 활성 멤버 수가 많은 플랜을 우선 노출한다. */
export function listPopularMembershipPlans(limit = 3) {
  return prisma.membershipPlan.findMany({
    orderBy: [{ memberships: { _count: "desc" } }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      priceKrw: true,
      creatorProfile: {
        select: {
          id: true,
          studioName: true,
          profileImageUrl: true,
        },
      },
      memberships: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
    },
  });
}
