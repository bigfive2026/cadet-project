import { describe, expect, it } from "vitest";
import { postCreateSchema } from "@/lib/validation/post";

describe("postCreateSchema (FR-012, FR-013, AC-007)", () => {
  it("PUBLIC 포스트는 priceKrw 없이 통과한다", () => {
    const result = postCreateSchema.safeParse({
      title: "공개 포스트",
      body: "내용",
      visibility: "PUBLIC",
    });
    expect(result.success).toBe(true);
  });

  it("MEMBER_ONLY 포스트는 priceKrw 없이 통과한다", () => {
    const result = postCreateSchema.safeParse({
      title: "멤버 전용",
      body: "내용",
      visibility: "MEMBER_ONLY",
    });
    expect(result.success).toBe(true);
  });

  it("PAID 포스트는 priceKrw > 0이면 통과한다 (AC-006)", () => {
    const result = postCreateSchema.safeParse({
      title: "유료 포스트",
      body: "내용",
      visibility: "PAID",
      priceKrw: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("PAID 포스트에서 priceKrw가 없으면 실패한다 (AC-007)", () => {
    const result = postCreateSchema.safeParse({
      title: "유료 포스트",
      body: "내용",
      visibility: "PAID",
    });
    expect(result.success).toBe(false);
  });

  it("PAID 포스트에서 priceKrw가 0이면 실패한다 (AC-007)", () => {
    const result = postCreateSchema.safeParse({
      title: "유료 포스트",
      body: "내용",
      visibility: "PAID",
      priceKrw: 0,
    });
    expect(result.success).toBe(false);
  });

  it("PAID 포스트에서 priceKrw가 음수이면 실패한다", () => {
    const result = postCreateSchema.safeParse({
      title: "유료 포스트",
      body: "내용",
      visibility: "PAID",
      priceKrw: -1000,
    });
    expect(result.success).toBe(false);
  });

  it("title이 없으면 실패한다", () => {
    const result = postCreateSchema.safeParse({ body: "내용", visibility: "PUBLIC" });
    expect(result.success).toBe(false);
  });

  it("body가 없으면 실패한다", () => {
    const result = postCreateSchema.safeParse({ title: "제목", visibility: "PUBLIC" });
    expect(result.success).toBe(false);
  });

  it("유효하지 않은 visibility 값은 실패한다", () => {
    const result = postCreateSchema.safeParse({
      title: "제목",
      body: "내용",
      visibility: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});
