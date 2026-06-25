// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StudioPortfolioIntro } from "@/components/studio/StudioPortfolioIntro";

const baseStudio = {
  studioName: "테스트 스튜디오",
  bio: "안녕하세요, 작가입니다.",
  // 작가 노트 = posts.length = 3
  posts: [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
  // 후원자 = ACTIVE 멤버십 합 = 2 + 1 = 3
  plans: [
    {
      id: "plan-low",
      title: "베이직",
      description: null,
      priceKrw: 5000,
      memberships: [{ id: "m1" }, { id: "m2" }],
    },
    {
      id: "plan-high",
      title: "프리미엄",
      description: null,
      priceKrw: 20000,
      memberships: [{ id: "m3" }],
    },
  ],
  // 프로그램 = 1
  programs: [
    { id: "prog-1", title: "드로잉 클래스", description: null, category: null, priceKrw: 30000 },
  ],
  works: [
    {
      id: "work-1",
      title: "봄 전시",
      kind: "전시",
      description: "첫 개인전",
      imageUrl: null,
      externalUrl: "https://example.com/work-1",
      startedAt: new Date("2025-01-01"),
      endedAt: new Date("2025-03-01"),
    },
  ],
};

describe("StudioPortfolioIntro", () => {
  it("스탯 행을 include 결과에서 파생한다 (작가 노트 / 후원자 / 프로그램)", () => {
    render(<StudioPortfolioIntro studio={baseStudio} creatorProfileId="c-1" />);
    // 후원자 = ACTIVE 멤버십 합(2+1=3)
    const supporterCard = screen.getByText("후원자").closest("div");
    expect(supporterCard?.textContent).toContain("3");
    const noteCard = screen.getByText("작가 노트").closest("div");
    expect(noteCard?.textContent).toContain("3");
    const programCard = screen.getByText("프로그램").closest("div");
    expect(programCard?.textContent).toContain("1");
  });

  it("작가 소개(bio)를 렌더한다", () => {
    render(<StudioPortfolioIntro studio={baseStudio} creatorProfileId="c-1" />);
    expect(screen.getByText("안녕하세요, 작가입니다.")).toBeTruthy();
  });

  it("bio가 없으면 빈 상태를 표시한다", () => {
    render(<StudioPortfolioIntro studio={{ ...baseStudio, bio: null }} creatorProfileId="c-1" />);
    expect(screen.getByText(/작가 소개가 아직 등록되지 않았습니다/)).toBeTruthy();
  });

  it("작품 갤러리에 제목과 기간을 렌더하고, externalUrl은 새 탭 링크로 감싼다", () => {
    render(<StudioPortfolioIntro studio={baseStudio} creatorProfileId="c-1" />);
    expect(screen.getByText("봄 전시")).toBeTruthy();
    // formatWorkPeriod 출력 포맷 보존 (기존 StudioTabs 회귀 단언과 동일 포맷)
    expect(screen.getByText("2025년 1월 - 2025년 3월")).toBeTruthy();
    const link = screen.getByText("봄 전시").closest("a");
    expect(link).toHaveAttribute("href", "https://example.com/work-1");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("작품이 없으면 갤러리 빈 상태를 표시한다", () => {
    render(<StudioPortfolioIntro studio={{ ...baseStudio, works: [] }} creatorProfileId="c-1" />);
    expect(screen.getByText(/아직 등록된 작품이 없습니다/)).toBeTruthy();
  });

  it("프로그램이 없으면 진행 프로그램 섹션 자체를 숨긴다", () => {
    render(<StudioPortfolioIntro studio={{ ...baseStudio, programs: [] }} creatorProfileId="c-1" />);
    expect(screen.queryByText("진행 중인 프로그램")).toBeNull();
  });

  it("멤버십 CTA는 대표(최저가) 플랜과 체크아웃 링크를 사용한다", () => {
    render(<StudioPortfolioIntro studio={baseStudio} creatorProfileId="c-1" />);
    expect(screen.getByText("멤버십으로 더 가까이")).toBeTruthy();
    // 최저가 = 베이직(5,000)
    expect(screen.getByText("베이직")).toBeTruthy();
    expect(screen.getByText(/5,000/)).toBeTruthy();
    const cta = screen.getByRole("link", { name: "멤버십 참여하기" });
    expect(cta).toHaveAttribute("href", "/creators/c-1/memberships/plan-low/checkout");
  });

  it("활성 멤버에게는 CTA를 '가입 완료'로 비활성화한다", () => {
    render(<StudioPortfolioIntro studio={baseStudio} creatorProfileId="c-1" isActiveMember />);
    expect(screen.getByRole("button", { name: "멤버십 가입 완료" })).toBeTruthy();
  });
});
