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
 * 알림 타입에 따른 링크 URL 생성 (NFR-005).
 *
 * APPLICATION_* 타입과 PROGRAM_CLOSED는 크리에이터 대시보드의
 * 프로그램 신청 목록으로 연결된다.
 * PAYMENT_COMPLETED(SPEC-006)는 해당 계약 확인 페이지로 연결된다.
 */
export function notificationHref(
  type: NotificationType,
  ctx: { programId?: string; applicationId?: string; contractId?: string },
): string | null {
  if (type === "PAYMENT_COMPLETED") {
    return ctx.contractId ? `/contracts/${ctx.contractId}` : null;
  }
  if (type === "REVIEW_REQUESTED") {
    // SPEC-008 FR-011: 리뷰는 프로그램 상세에서 작성한다.
    return ctx.programId ? `/programs/${ctx.programId}` : null;
  }
  if (!ctx.programId) return null;
  return `/dashboard/creator/programs/${ctx.programId}/applications`;
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
