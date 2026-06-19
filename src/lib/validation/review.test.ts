import { describe, expect, it } from "vitest";
import { reviewSchema } from "./review";

describe("reviewSchema (SPEC-008 FR-005, FR-007, AC-007)", () => {
  it("rating 1~5와 comment를 통과시킨다 (AC-005)", () => {
    const parsed = reviewSchema.safeParse({ rating: 5, comment: "좋았습니다" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.rating).toBe(5);
      expect(parsed.data.comment).toBe("좋았습니다");
    }
  });

  it("comment 없이도 통과한다 (FR-005 comment?)", () => {
    const parsed = reviewSchema.safeParse({ rating: 3 });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.comment).toBeNull();
  });

  it("rating=0은 거부한다 (AC-007)", () => {
    expect(reviewSchema.safeParse({ rating: 0 }).success).toBe(false);
  });

  it("rating=6은 거부한다 (AC-007)", () => {
    expect(reviewSchema.safeParse({ rating: 6 }).success).toBe(false);
  });

  it("rating이 정수가 아니면 거부한다", () => {
    expect(reviewSchema.safeParse({ rating: 3.5 }).success).toBe(false);
  });

  it("rating이 누락되면 거부한다", () => {
    expect(reviewSchema.safeParse({ comment: "x" }).success).toBe(false);
  });

  it("빈 문자열 comment는 null로 정규화한다", () => {
    const parsed = reviewSchema.safeParse({ rating: 4, comment: "   " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.comment).toBeNull();
  });
});
