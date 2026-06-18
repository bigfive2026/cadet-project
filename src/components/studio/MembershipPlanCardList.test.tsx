// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MembershipPlanCardList } from "@/components/studio/MembershipPlanCardList";

// Server Action mock
vi.mock("@/app/(app)/creators/[creatorId]/actions", () => ({
  joinMembership: vi.fn(),
}));

const plans = [
  { id: "plan-1", title: "브론즈 멤버십", description: "기본 혜택", priceKrw: 5000 },
  { id: "plan-2", title: "실버 멤버십", description: null, priceKrw: 10000 },
];

describe("MembershipPlanCardList (FR-003, FR-006, AC-003)", () => {
  it("플랜이 없으면 빈 상태 메시지를 렌더링한다", () => {
    render(<MembershipPlanCardList plans={[]} isActiveMember={false} />);
    expect(screen.getByText("아직 멤버십 플랜이 없습니다.")).toBeTruthy();
  });

  it("플랜 목록과 가격을 렌더링한다 (FR-003)", () => {
    render(<MembershipPlanCardList plans={plans} isActiveMember={false} />);
    expect(screen.getByText("브론즈 멤버십")).toBeTruthy();
    expect(screen.getByText("₩5,000")).toBeTruthy();
    expect(screen.getByText("실버 멤버십")).toBeTruthy();
    expect(screen.getByText("₩10,000")).toBeTruthy();
  });

  it("비멤버에게 '멤버십 가입하기' 버튼이 활성화된다 (FR-006)", () => {
    render(<MembershipPlanCardList plans={plans} isActiveMember={false} />);
    const buttons = screen.getAllByRole("button", { name: "멤버십 가입하기" });
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((btn) => {
      expect(btn).not.toBeDisabled();
    });
  });

  it("이미 멤버인 경우 '멤버십 가입 완료' 버튼이 비활성화된다 (FR-006, AC-003)", () => {
    render(<MembershipPlanCardList plans={plans} isActiveMember={true} />);
    const buttons = screen.getAllByRole("button", { name: "멤버십 가입 완료" });
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it("description이 있는 플랜은 설명을 렌더링한다", () => {
    render(<MembershipPlanCardList plans={plans} isActiveMember={false} />);
    expect(screen.getByText("기본 혜택")).toBeTruthy();
  });
});
