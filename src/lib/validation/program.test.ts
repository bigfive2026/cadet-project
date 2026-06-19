import { describe, expect, it } from "vitest";
import { programCreateSchema, programUpdateSchema } from "@/lib/validation/program";

describe("programCreateSchema (FR-001, NFR-003)", () => {
  it("필수 필드(title, priceKrw)만으로 통과한다", () => {
    const result = programCreateSchema.safeParse({ title: "4주 드로잉 챌린지", priceKrw: 35000 });
    expect(result.success).toBe(true);
  });

  it("전체 필드를 채워 통과한다", () => {
    const result = programCreateSchema.safeParse({
      title: "클럽",
      description: "설명",
      priceKrw: 30000,
      category: "클래스",
      startDate: "2026-07-01",
      endDate: "2026-07-28",
      recruitDeadline: "2026-06-30",
      maxParticipants: 20,
      status: "RECRUITING",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startDate).toBeInstanceOf(Date);
    }
  });

  it("title이 없으면 실패한다", () => {
    expect(programCreateSchema.safeParse({ priceKrw: 1000 }).success).toBe(false);
  });

  it("priceKrw가 음수면 실패한다", () => {
    expect(programCreateSchema.safeParse({ title: "x", priceKrw: -1 }).success).toBe(false);
  });

  it("priceKrw가 0이면 통과한다 (무료 프로그램 허용)", () => {
    expect(programCreateSchema.safeParse({ title: "x", priceKrw: 0 }).success).toBe(true);
  });

  it("maxParticipants가 0이면 실패한다", () => {
    expect(programCreateSchema.safeParse({ title: "x", priceKrw: 1, maxParticipants: 0 }).success).toBe(false);
  });

  it("유효하지 않은 status는 실패한다", () => {
    expect(
      programCreateSchema.safeParse({ title: "x", priceKrw: 1, status: "INVALID" }).success,
    ).toBe(false);
  });
});

describe("programUpdateSchema (FR-006)", () => {
  it("부분 필드만으로 통과한다", () => {
    expect(programUpdateSchema.safeParse({ status: "CLOSED" }).success).toBe(true);
  });

  it("빈 객체는 실패한다", () => {
    expect(programUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("nullable 필드를 null로 초기화할 수 있다", () => {
    const result = programUpdateSchema.safeParse({ category: null, recruitDeadline: null });
    expect(result.success).toBe(true);
  });

  it("유효하지 않은 status는 실패한다", () => {
    expect(programUpdateSchema.safeParse({ status: "WRONG" }).success).toBe(false);
  });
});
