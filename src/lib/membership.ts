import { prisma } from "@/lib/prisma";

/**
 * 팬이 해당 크리에이터의 활성 멤버인지 확인한다 (SPEC-003 FR-007, AC-008).
 * Membership 레코드 존재 여부로 활성 상태를 판단 (스키마에 status 필드 없음).
 *
 * @MX:ANCHOR: [AUTO] 멤버십 접근 제어의 핵심 판정 함수 — 여러 곳에서 호출됨
 * @MX:REASON: post-access, API 라우트, 서버 액션에서 fan_in >= 3으로 사용
 */
export async function isActiveMember(
  userId: string,
  creatorProfileId: string,
): Promise<boolean> {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      plan: { creatorProfileId },
    },
  });
  return membership !== null;
}
