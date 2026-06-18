import { describe, expect, it } from "vitest";
import { membershipPlanCreateSchema } from "@/lib/validation/membership";

describe("membershipPlanCreateSchema (FR-001, AC-009)", () => {
  it("유효한 플랜 데이터를 통과시킨다", () => {
    const result = membershipPlanCreateSchema.safeParse({
      title: "브론즈 멤버십",
      priceKrw: 5000,
      description: "기본 멤버십",
    });
    expect(result.success).toBe(true);
  });

  it("description이 없어도 통과한다", () => {
    const result = membershipPlanCreateSchema.safeParse({
      title: "실버 멤버십",
      priceKrw: 10000,
    });
    expect(result.success).toBe(true);
  });

  it("title이 없으면 실패한다", () => {
    const result = membershipPlanCreateSchema.safeParse({ priceKrw: 5000 });
    expect(result.success).toBe(false);
  });

  it("priceKrw가 없으면 실패한다", () => {
    const result = membershipPlanCreateSchema.safeParse({ title: "플랜" });
    expect(result.success).toBe(false);
  });

  it("priceKrw가 0 이하이면 실패한다", () => {
    const result = membershipPlanCreateSchema.safeParse({ title: "플랜", priceKrw: 0 });
    expect(result.success).toBe(false);
  });

  it("priceKrw가 음수이면 실패한다", () => {
    const result = membershipPlanCreateSchema.safeParse({ title: "플랜", priceKrw: -100 });
    expect(result.success).toBe(false);
  });
});
