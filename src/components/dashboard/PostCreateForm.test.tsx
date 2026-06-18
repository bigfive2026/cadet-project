// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PostCreateForm } from "@/components/dashboard/PostCreateForm";

describe("PostCreateForm (FR-012, FR-013)", () => {
  const mockAction = vi.fn();

  it("title, body, visibility 라디오를 렌더링한다", () => {
    render(<PostCreateForm action={mockAction} />);
    expect(screen.getByLabelText("제목")).toBeTruthy();
    expect(screen.getByLabelText("본문")).toBeTruthy();
    expect(screen.getByDisplayValue("PUBLIC")).toBeTruthy();
    expect(screen.getByDisplayValue("MEMBER_ONLY")).toBeTruthy();
    expect(screen.getByDisplayValue("PAID")).toBeTruthy();
  });

  it("기본 visibility는 PUBLIC이다", () => {
    render(<PostCreateForm action={mockAction} />);
    const publicRadio = screen.getByDisplayValue("PUBLIC") as HTMLInputElement;
    expect(publicRadio.checked).toBe(true);
  });

  it("PAID 선택 시 priceKrw 입력 필드가 나타난다 (FR-013)", () => {
    render(<PostCreateForm action={mockAction} />);
    expect(screen.queryByLabelText("가격 (원)")).toBeNull();
    fireEvent.click(screen.getByDisplayValue("PAID"));
    expect(screen.getByLabelText("가격 (원)")).toBeTruthy();
  });

  it("PUBLIC 선택 시 priceKrw 입력 필드가 없다", () => {
    render(<PostCreateForm action={mockAction} />);
    fireEvent.click(screen.getByDisplayValue("PAID"));
    fireEvent.click(screen.getByDisplayValue("PUBLIC"));
    expect(screen.queryByLabelText("가격 (원)")).toBeNull();
  });
});
