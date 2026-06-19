import type { ProgramStatus } from "@prisma/client";

/**
 * 프로그램 상태 정책 (SPEC-004 FR-003, FR-005, FR-007, NFR-003).
 *
 * 상태 전이는 서버에서 화이트리스트로만 허용한다 (클라이언트가 임의 status를
 * 설정할 수 없음). CONTRACTING/IN_PROGRESS/COMPLETED 전이는 SPEC-005/006/008이
 * 트리거하므로 본 SPEC의 수동 수정 흐름에서는 자기 자신으로의 no-op만 허용한다.
 */

/** 공개 목록(/programs)과 스튜디오 "클럽" 탭에 노출되는 상태 (FR-003, FR-009). */
export const PUBLIC_PROGRAM_STATUSES: ProgramStatus[] = [
  "RECRUITING",
  "CLOSED",
  "CONTRACTING",
  "IN_PROGRESS",
  "COMPLETED",
];

/**
 * 본 SPEC의 생성/수정 흐름에서 허용되는 상태 전이 화이트리스트.
 * 같은 상태로의 no-op은 항상 허용한다.
 *
 * @MX:ANCHOR: [AUTO] 상태 전이 규칙 — API PATCH 경계의 무결성 계약 (NFR-003)
 * @MX:REASON: API 라우트와 서비스 양쪽에서 참조 — fan_in >= 3, 위반 시 400 반환
 */
const ALLOWED_TRANSITIONS: Record<ProgramStatus, ProgramStatus[]> = {
  DRAFT: ["RECRUITING", "CANCELLED"],
  RECRUITING: ["CLOSED", "CANCELLED"],
  CLOSED: ["RECRUITING", "CANCELLED"],
  CONTRACTING: [],
  IN_PROGRESS: [],
  COMPLETED: [],
  CANCELLED: [],
};

/** from → to 전이가 허용되는지 검사한다 (FR-007, AC-009). */
export function isTransitionAllowed(from: ProgramStatus, to: ProgramStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * 조회 시점에 모집 마감을 평가한다 (FR-005, AC-006).
 * RECRUITING이고 recruitDeadline이 과거이면 CLOSED로 간주(표시)한다. DB는 변경하지 않는다.
 */
export function effectiveStatus(
  program: { status: ProgramStatus; recruitDeadline?: Date | null },
  now: Date = new Date(),
): ProgramStatus {
  if (
    program.status === "RECRUITING" &&
    program.recruitDeadline &&
    program.recruitDeadline.getTime() < now.getTime()
  ) {
    return "CLOSED";
  }
  return program.status;
}

/** 공개 노출 대상인지 검사한다 (soft-delete 제외 + 공개 상태) (FR-003, FR-008, FR-009). */
export function isPubliclyVisible(program: {
  status: ProgramStatus;
  deletedAt?: Date | null;
}): boolean {
  if (program.deletedAt) return false;
  return PUBLIC_PROGRAM_STATUSES.includes(program.status);
}

/** 상태 → 한국어 라벨 (UI 배지). */
export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  DRAFT: "작성 중",
  RECRUITING: "모집 중",
  CLOSED: "모집 마감",
  CONTRACTING: "계약 대기",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  CANCELLED: "취소",
};
