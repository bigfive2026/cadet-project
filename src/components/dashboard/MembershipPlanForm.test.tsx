// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MembershipPlanForm } from "@/components/dashboard/MembershipPlanForm";

describe("MembershipPlanForm (FR-001)", () => {
  const mockAction = vi.fn();

  it("플랜 이름, 가격, 설명 필드를 렌더링한다", () => {
    render(<MembershipPlanForm action={mockAction} />);
    expect(screen.getByLabelText("플랜 이름")).toBeTruthy();
    expect(screen.getByLabelText("월 가격 (원)")).toBeTruthy();
    expect(screen.getByLabelText("설명 (선택)")).toBeTruthy();
  });

  it("'멤버십 플랜 생성' 제출 버튼이 있다", () => {
    render(<MembershipPlanForm action={mockAction} />);
    expect(screen.getByRole("button", { name: "멤버십 플랜 생성" })).toBeTruthy();
  });
});
