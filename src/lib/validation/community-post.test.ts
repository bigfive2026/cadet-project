import { describe, expect, it } from "vitest";
import {
  communityPostCreateSchema,
  communityPostUpdateSchema,
} from "@/lib/validation/community-post";

describe("communityPostCreateSchema (FR-004)", () => {
  it("creatorProfileId, title, content가 유효하면 통과한다", () => {
    const result = communityPostCreateSchema.safeParse({
      creatorProfileId: "p-1",
      title: "안녕하세요",
      content: "첫 글",
    });
    expect(result.success).toBe(true);
  });

  it("title이 비어 있으면 실패한다", () => {
    const result = communityPostCreateSchema.safeParse({
      creatorProfileId: "p-1",
      title: "",
      content: "내용",
    });
    expect(result.success).toBe(false);
  });

  it("content가 비어 있으면 실패한다", () => {
    const result = communityPostCreateSchema.safeParse({
      creatorProfileId: "p-1",
      title: "제목",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("creatorProfileId가 없으면 실패한다", () => {
    const result = communityPostCreateSchema.safeParse({
      title: "제목",
      content: "내용",
    });
    expect(result.success).toBe(false);
  });

  it("title이 200자를 초과하면 실패한다", () => {
    const result = communityPostCreateSchema.safeParse({
      creatorProfileId: "p-1",
      title: "가".repeat(201),
      content: "내용",
    });
    expect(result.success).toBe(false);
  });
});

describe("communityPostUpdateSchema (FR-006)", () => {
  it("title만 제공해도 통과한다", () => {
    const result = communityPostUpdateSchema.safeParse({ title: "수정" });
    expect(result.success).toBe(true);
  });

  it("content만 제공해도 통과한다", () => {
    const result = communityPostUpdateSchema.safeParse({ content: "수정 내용" });
    expect(result.success).toBe(true);
  });

  it("title과 content 모두 제공해도 통과한다", () => {
    const result = communityPostUpdateSchema.safeParse({
      title: "수정",
      content: "수정 내용",
    });
    expect(result.success).toBe(true);
  });

  it("아무 필드도 없으면 실패한다 (수정할 내용 없음)", () => {
    const result = communityPostUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("title이 빈 문자열이면 실패한다", () => {
    const result = communityPostUpdateSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });
});
