/**
 * 알림 타입 상수 및 유틸리티 (SPEC-005 NFR-005).
 *
 * 알림 타입에 따른 메시지 생성과 링크 해석을 담당한다.
 */

export const NOTIFICATION_TYPES = [
  "APPLICATION_CREATED",
  "APPLICATION_ACCEPTED",
  "APPLICATION_REJECTED",
  "APPLICATION_AUTO_REJECTED",
  "PROGRAM_CLOSED",
  // SPEC-006 FR-010: 결제 완료 알림
  "PAYMENT_COMPLETED",
  // SPEC-008 FR-002: 완료 승인 후 리뷰 요청 알림
  "REVIEW_REQUESTED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * 크리에이터가 수신하는 알림 타입 (AC-008 접근성 회귀 방지용).
 * 이 타입들만 크리에이터 대시보드(/dashboard/*)로 연결된다.
 * 그 외 APPLICATION_ACCEPTED/REJECTED/AUTO_REJECTED, PROGRAM_CLOSED는
 * 팬에게 전송되므로 팬이 접근 가능한 공개 프로그램 상세로 연결되어야 한다.
 */
const CREATOR_AUDIENCE_TYPES: ReadonlySet<NotificationType> = new Set([
  "APPLICATION_CREATED",
]);

/**
 * 알림 타입에 따른 링크 URL 생성 (NFR-005).
 *
 * 수신자 역할에 따라 링크를 분기한다:
 * - APPLICATION_CREATED (크리에이터 수신) → 크리에이터 대시보드 신청 목록
 * - APPLICATION_ACCEPTED/REJECTED/AUTO_REJECTED, PROGRAM_CLOSED (팬 수신) → 공개 프로그램 상세
 * - PAYMENT_COMPLETED → 계약 결제(SPEC-006)면 계약 확인, 단건 구매(SPEC-009)면 포스트 상세
 * - REVIEW_REQUESTED (팬 수신) → 프로그램 상세에서 리뷰 작성
 */
export function notificationHref(
  type: NotificationType,
  ctx: { programId?: string; applicationId?: string; contractId?: string; postId?: string },
): string | null {
  if (type === "PAYMENT_COMPLETED") {
    // SPEC-009: 단건 포스트 구매는 포스트 상세로 연결한다.
    if (ctx.postId) return `/posts/${ctx.postId}`;
    return ctx.contractId ? `/contracts/${ctx.contractId}` : null;
  }
  if (type === "REVIEW_REQUESTED") {
    // SPEC-008 FR-011: 리뷰는 프로그램 상세에서 작성한다.
    return ctx.programId ? `/programs/${ctx.programId}` : null;
  }
  if (!ctx.programId) return null;
  if (CREATOR_AUDIENCE_TYPES.has(type)) {
    return `/dashboard/creator/programs/${ctx.programId}/applications`;
  }
  // 팬 수신 알림: proxy(/dashboard/* 보호)를 통과하는 공개 라우트로 연결 (AC-008).
  return `/programs/${ctx.programId}`;
}

/**
 * 알림 타입에 따른 한국어 메시지 생성 (NFR-005).
 */
export function buildNotificationMessage(
  type: NotificationType,
  _ctx: Record<string, unknown>,
): string {
  switch (type) {
    case "APPLICATION_CREATED":
      return "새로운 신청이 도착했습니다.";
    case "APPLICATION_ACCEPTED":
      return "신청이 수락되었습니다.";
    case "APPLICATION_REJECTED":
      return "신청이 거절되었습니다.";
    case "APPLICATION_AUTO_REJECTED":
      return "다른 참여자가 선택되어 자동으로 거절되었습니다.";
    case "PROGRAM_CLOSED":
      return "프로그램 모집이 마감되었습니다.";
    case "PAYMENT_COMPLETED":
      return "결제가 완료되었습니다.";
    case "REVIEW_REQUESTED":
      return "프로그램이 완료되었습니다. 리뷰를 작성해 보세요.";
    default:
      // TypeScript에서 exhaustiveness 검사를 위해
      const _exhaustive: never = type;
      return _exhaustive;
  }
}
