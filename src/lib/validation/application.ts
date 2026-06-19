import { z } from "zod";

/**
 * 신청 검증 스키마 (SPEC-005).
 */

/**
 * 프로그램 참여 신청 입력 (FR-001, AC-001).
 * message는 선택값이며 1000자 제한이다.
 */
export const applySchema = z.object({
  message: z.string().max(1000).optional(),
});

/**
 * 신청 처리 입력 (FR-007, FR-008, AC-010, AC-011).
 * - accept: 신청 수락 (autoRejectOthers true면 다른 PENDING은 AUTO_REJECTED)
 * - reject: 신청 거절
 */
export const processSchema = z.object({
  action: z.enum(["accept", "reject"]),
  autoRejectOthers: z.boolean().optional(),
});

export type ApplyInput = z.infer<typeof applySchema>;
export type ProcessInput = z.infer<typeof processSchema>;
