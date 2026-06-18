import { z } from "zod";

/**
 * 포스트 생성 스키마 (SPEC-003 FR-012, FR-013, AC-007).
 * visibility === PAID 이면 priceKrw > 0 필수 (superRefine으로 조건부 검증).
 */
export const postCreateSchema = z
  .object({
    title: z.string().min(1).max(200),
    body: z.string().min(1),
    visibility: z.enum(["PUBLIC", "MEMBER_ONLY", "PAID"]),
    priceKrw: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.visibility === "PAID" && !data.priceKrw) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PAID 포스트는 priceKrw가 0보다 큰 정수여야 합니다.",
        path: ["priceKrw"],
      });
    }
  });

export type PostCreateInput = z.infer<typeof postCreateSchema>;
