import { z } from "zod";

/**
 * 단건 포스트 구매 입력 검증 (SPEC-009 FR-003).
 *
 * postId는 URL 경로에서 받으므로 본문은 선택값이며, 현재는 mock provider만 허용한다
 * (NFR-006: 확장 시 enum 추가). SPEC-006 paymentSchema와 동일한 형태.
 */
export const purchaseSchema = z.object({
  provider: z.enum(["mock"]).default("mock"),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;
