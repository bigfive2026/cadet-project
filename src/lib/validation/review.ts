import { z } from "zod";

/**
 * 리뷰 검증 스키마 (SPEC-008 FR-005, FR-007, AC-005, AC-007).
 *
 * - rating: 1~5 정수 (FR-007, AC-007). 범위 밖이면 검증 실패 → 400.
 * - comment: 선택. 빈 문자열/공백은 null로 정규화하여 저장하지 않는다.
 */
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
