import type { PostVisibility } from "@prisma/client";
import type { AppUser } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { isActiveMember } from "@/lib/membership";

/**
 * 팬이 해당 PAID 포스트를 이미 구매했는지 확인한다 (SPEC-009 FR-007).
 * `status IN (PAID, RELEASED)`인 Payment 레코드가 존재하면 true.
 * PENDING/FAILED 결제는 열람을 허용하지 않는다 (FR-008).
 *
 * @MX:ANCHOR: [AUTO] PAID 포스트 구매 여부 판정 — canViewPost 및 구매 흐름에서 사용
 * @MX:REASON: canViewPost(PAID 분기), 구매 중복 체크에서 fan_in >= 2로 사용; 결제 경계
 */
export async function hasPurchasedPost(userId: string, postId: string): Promise<boolean> {
  const payment = await prisma.payment.findFirst({
    where: { postId, fanUserId: userId, status: { in: ["PAID", "RELEASED"] } },
  });
  return payment !== null;
}

/**
 * 포스트 접근 가능 여부를 판정한다 (SPEC-003 FR-008, SPEC-009 FR-006).
 * 판정 규칙:
 *   - PUBLIC → 누구나 true (비로그인 포함)
 *   - 작성자 본인 → true (visibility 무관)
 *   - MEMBER_ONLY → isActiveMember(user.id, post.creatorProfileId)
 *   - PAID → hasPurchasedPost(user.id, post.id) (SPEC-009: 구매자만 true)
 *   - 비로그인(user=null) + MEMBER_ONLY/PAID → false
 *
 * [NFR-002] 이 함수를 서버 측에서 호출하고,
 * false 시 body를 클라이언트에 전달하지 않아야 한다.
 *
 * @MX:ANCHOR: [AUTO] 포스트 접근 제어의 핵심 판정 함수 — 여러 곳에서 호출됨
 * @MX:REASON: 포스트 상세 페이지, API 라우트에서 fan_in >= 3으로 사용; 보안 경계
 */
export async function canViewPost(
  user: AppUser | null,
  post: { id: string; creatorProfileId: string; visibility: PostVisibility },
): Promise<boolean> {
  // PUBLIC → 누구나 접근 가능
  if (post.visibility === "PUBLIC") {
    return true;
  }

  // 비로그인 사용자 → PUBLIC 외 모두 거부
  if (!user) {
    return false;
  }

  // 작성자 본인 → 항상 접근 가능 (FR-002)
  if (user.creatorProfile?.id === post.creatorProfileId) {
    return true;
  }

  // MEMBER_ONLY → 활성 멤버 여부 확인
  if (post.visibility === "MEMBER_ONLY") {
    return isActiveMember(user.id, post.creatorProfileId);
  }

  // PAID → 구매 이력 확인 (SPEC-009 FR-006)
  if (post.visibility === "PAID") {
    return hasPurchasedPost(user.id, post.id);
  }

  return false;
}
