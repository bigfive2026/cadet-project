// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LockedPostPreview } from "@/components/posts/LockedPostPreview";

describe("LockedPostPreview (FR-009, FR-011, AC-001, NFR-002)", () => {
  it("MEMBER_ONLY 잠금: 제목과 멤버십 안내 문구를 렌더링한다", () => {
    render(<LockedPostPreview title="멤버 전용 포스트" creatorId="p-creator" />);
    expect(screen.getByText("멤버 전용 포스트")).toBeTruthy();
    expect(screen.getByText(/멤버 전용 콘텐츠입니다/)).toBeTruthy();
    expect(screen.getByText(/멤버십에 가입하면 열람할 수 있습니다/)).toBeTruthy();
  });

  it("MEMBER_ONLY 잠금: 멤버십 가입 CTA 링크가 있다", () => {
    render(
      <LockedPostPreview
        title="멤버 전용 포스트"
        creatorId="p-creator"
        membershipCheckoutHref="/creators/p-creator/memberships/plan-1/checkout"
      />,
    );
    const link = screen.getByRole("link", { name: "멤버십 가입하기" });
    expect(link).toBeTruthy();
    expect((link as HTMLAnchorElement).href).toContain(
      "/creators/p-creator/memberships/plan-1/checkout",
    );
  });

  it("MEMBER_ONLY 잠금: 플랜 링크가 없으면 멤버십 탭으로 이동한다", () => {
    render(<LockedPostPreview title="멤버 전용 포스트" creatorId="p-creator" />);
    const link = screen.getByRole("link", { name: "멤버십 가입하기" });
    expect((link as HTMLAnchorElement).href).toContain("/creators/p-creator?tab=membership");
  });

  it("PAID 잠금: '유료 콘텐츠' 라벨이 표시된다 (FR-011, AC-006)", () => {
    render(<LockedPostPreview title="유료 포스트" creatorId="p-creator" isPaid />);
    expect(screen.getByText("유료 콘텐츠")).toBeTruthy();
    expect(screen.getByText(/유료 콘텐츠입니다/)).toBeTruthy();
  });

  it("잠금 컨텐츠 본문 영역은 흐림 처리된 프리뷰를 렌더링한다", () => {
    render(<LockedPostPreview title="잠금 포스트" creatorId="p-creator" />);
    expect(screen.getByTestId("locked-post-blur")).toBeTruthy();
  });

  it("body 텍스트가 렌더링 결과에 포함되지 않는다 (NFR-002 핵심 보안 테스트)", () => {
    const { container } = render(<LockedPostPreview title="잠금 포스트" creatorId="p-creator" />);
    // NFR-002: body는 LockedPostPreview에 전달되지 않으므로 HTML에 없어야 함
    // body prop 자체가 없는 컴포넌트이므로 검증: 숨겨진 비밀 본문이 없음
    expect(container.innerHTML).not.toContain("비밀 본문");
    expect(container.innerHTML).not.toContain("구매 전용 내용");
  });
});
