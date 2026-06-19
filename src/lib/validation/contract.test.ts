import { describe, expect, it } from "vitest";
import { signSchema, paymentSchema, createContractSchema } from "./contract";

describe("lib/validation/contract (SPEC-006)", () => {
  describe("signSchema (FR-003, FR-004)", () => {
    it("agreed=true는 통과한다", () => {
      expect(signSchema.safeParse({ agreed: true }).success).toBe(true);
    });

    it("agreed=false는 거부한다 (AC-002)", () => {
      expect(signSchema.safeParse({ agreed: false }).success).toBe(false);
    });

    it("agreed 누락은 거부한다", () => {
      expect(signSchema.safeParse({}).success).toBe(false);
    });
  });

  describe("paymentSchema (FR-006, FR-007)", () => {
    it("provider 누락 시 mock으로 기본 설정된다", () => {
      const parsed = paymentSchema.safeParse({});
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.provider).toBe("mock");
    });

    it("mock provider는 통과한다", () => {
      expect(paymentSchema.safeParse({ provider: "mock" }).success).toBe(true);
    });

    it("알 수 없는 provider는 거부한다", () => {
      expect(paymentSchema.safeParse({ provider: "toss" }).success).toBe(false);
    });
  });

  describe("createContractSchema (FR-001)", () => {
    it("applicationId가 있으면 통과한다", () => {
      expect(createContractSchema.safeParse({ applicationId: "a1" }).success).toBe(true);
    });

    it("빈 applicationId는 거부한다", () => {
      expect(createContractSchema.safeParse({ applicationId: "" }).success).toBe(false);
    });
  });
});
