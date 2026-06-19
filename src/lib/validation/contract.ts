import { z } from "zod";

/**
 * 계약/결제 검증 스키마 (SPEC-006).
 */

/**
 * 서명 입력 (FR-003, FR-004, AC-002, AC-003).
 * `agreed`는 반드시 true여야 한다. false/누락 시 검증 실패 → 400.
 */
export const signSchema = z.object({
  agreed: z.literal(true),
});

/**
 * 결제 시작 입력 (FR-006, FR-007).
 * 현재는 mock provider만 허용한다 (NFR-005: 확장 시 enum 추가).
 */
export const paymentSchema = z.object({
  provider: z.enum(["mock"]).default("mock"),
});

/**
 * 계약 생성/조회 입력 (FR-001, FR-002).
 */
export const createContractSchema = z.object({
  applicationId: z.string().min(1),
});

export type SignInput = z.infer<typeof signSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
