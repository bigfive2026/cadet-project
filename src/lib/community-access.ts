import { prisma } from "@/lib/prisma";
import { isActiveMember } from "@/lib/membership";

/**
 * 커뮤니티 접근 가능 여부를 판정한다 (SPEC-007 FR-001, AC-001, AC-002, AC-003).
 * 다음 중 하나라도 참이면 true:
 *   (a) 해당 크리에이터의 활성 Membership 존재 (SPEC-003 isActiveMember)
 *   (b) 해당 크리에이터 Program에 대해 status=ACCEPTED + 결제 완료
 *       (Contract.payments 중 status IN [PAID, RELEASED])인 ProgramApplication 존재
 *   (c) 본인이 해당 CreatorProfile의 소유 크리에이터
 *
 * [NFR-001] 서버 측에서 호출하여 접근 제어를 수행한다 (클라이언트 게이트 금지).
 * 단락 평가로 불필요한 쿼리를 피한다.
 *
 * @MX:ANCHOR: [AUTO] 커뮤니티 접근 제어의 핵심 판정 함수 — 여러 곳에서 호출됨
 * @MX:REASON: 스튜디오 페이지, 글 작성 API에서 fan_in >= 3으로 사용; 보안 경계
 */
export async function canAccessCommunity(
  userId: string,
  creatorProfileId: string,
): Promise<boolean> {
  // (a) 활성 멤버
  if (await isActiveMember(userId, creatorProfileId)) {
    return true;
  }

  // (b) 결제 완료 참여자 — 단일 쿼리로 ACCEPTED + PAID/RELEASED 판정 (NFR-002)
  const paidApplication = await prisma.programApplication.findFirst({
    where: {
      userId,
      status: "ACCEPTED",
      program: { creatorProfileId },
      contract: {
        payments: {
          some: { status: { in: ["PAID", "RELEASED"] } },
        },
      },
    },
    select: { id: true },
  });
  if (paidApplication) {
    return true;
  }

  // (c) 소유 크리에이터 본인
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, creatorProfile: { select: { id: true } } },
  });
  if (user?.role === "CREATOR" && user.creatorProfile?.id === creatorProfileId) {
    return true;
  }

  return false;
}
