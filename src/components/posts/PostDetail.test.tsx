// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PostDetail } from "@/components/posts/PostDetail";

describe("PostDetail (FR-010, AC-004)", () => {
  const post = { id: "p-1", title: "공개 포스트", body: "전체 본문 내용입니다.", visibility: "PUBLIC" };

  it("title과 body를 모두 렌더링한다", () => {
    render(<PostDetail post={post} />);
    expect(screen.getByText("공개 포스트")).toBeTruthy();
    expect(screen.getByText("전체 본문 내용입니다.")).toBeTruthy();
  });
});
