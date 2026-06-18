import type { PostVisibility } from "@prisma/client";
import type { AppUser } from "@/lib/types";
import { isActiveMember } from "@/lib/membership";

/**
 * 포스트 접근 가능 여부를 판정한다 (SPEC-003 FR-008).
 * 판정 규칙:
 *   - PUBLIC → 누구나 true (비로그인 포함)
 *   - 작성자 본인 → true (visibility 무관)
 *   - MEMBER_ONLY → isActiveMember(user.id, post.creatorProfileId)
 *   - PAID → MVP 범위에서 비구매자는 false, 작성자는 true (위에서 처리됨)
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
  post: { creatorProfileId: string; visibility: PostVisibility },
): Promise<boolean> {
  // PUBLIC → 누구나 접근 가능
  if (post.visibility === "PUBLIC") {
    return true;
  }

  // 비로그인 사용자 → PUBLIC 외 모두 거부
  if (!user) {
    return false;
  }

  // 작성자 본인 → 항상 접근 가능
  if (user.creatorProfile?.id === post.creatorProfileId) {
    return true;
  }

  // MEMBER_ONLY → 활성 멤버 여부 확인
  if (post.visibility === "MEMBER_ONLY") {
    return isActiveMember(user.id, post.creatorProfileId);
  }

  // PAID → MVP 범위에서 비구매자 false
  return false;
}
