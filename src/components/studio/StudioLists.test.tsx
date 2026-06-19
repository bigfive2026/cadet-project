// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// SPEC-003: joinMembership Server Action mock (MembershipPlanCardList 의존)
vi.mock("@/app/(app)/creators/[creatorId]/actions", () => ({
  joinMembership: vi.fn(),
}));
// SPEC-007: CommunityPostComposer가 useRouter를 사용하므로 mock 필요
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
import { StudioHeader } from "@/components/studio/StudioHeader";
import { StudioTabs } from "@/components/studio/StudioTabs";
import { PostCardList } from "@/components/studio/PostCardList";
import { MembershipPlanCardList } from "@/components/studio/MembershipPlanCardList";
import { ProgramCardList } from "@/components/studio/ProgramCardList";

const baseStudio = {
  id: "p-1",
  studioName: "신진작가 스튜디오",
  bio: "작가 소개",
};

describe("StudioHeader (NFR-004)", () => {
  it("renders studioName and bio", () => {
    render(<StudioHeader studio={baseStudio} />);
    expect(screen.getByText("신진작가 스튜디오")).toBeTruthy();
    expect(screen.getByText("작가 소개")).toBeTruthy();
  });

  it("renders instagram/website links when present", () => {
    render(
      <StudioHeader
        studio={{
          ...baseStudio,
          instagramUrl: "https://instagram.com/foo",
          websiteUrl: "https://example.com",
        }}
      />,
    );
    expect(screen.getByText(/Instagram/)).toBeTruthy();
    expect(screen.getByText(/Website/)).toBeTruthy();
  });

  it("does not crash when all optional fields are null", () => {
    expect(() => render(<StudioHeader studio={baseStudio} />)).not.toThrow();
  });

  it("renders cover/profile images and category when present", () => {
    render(
      <StudioHeader
        studio={{
          ...baseStudio,
          coverImageUrl: "https://example.com/cover.jpg",
          profileImageUrl: "https://example.com/profile.jpg",
          category: "회화",
        }}
      />,
    );
    const imgs = screen.getAllByRole("img");
    expect(imgs.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("회화")).toBeTruthy();
  });
});

describe("PostCardList", () => {
  it("renders visibility badge for each post", () => {
    const posts = [
      { id: "post-1", title: "공개 포스트", body: "x", visibility: "PUBLIC" as const, priceKrw: null },
      { id: "post-2", title: "멤버 포스트", body: "x", visibility: "MEMBER_ONLY" as const, priceKrw: null },
      { id: "post-3", title: "유료 포스트", body: "x", visibility: "PAID" as const, priceKrw: 5000 },
    ];
    render(<PostCardList posts={posts} />);
    expect(screen.getByText("공개")).toBeTruthy();
    expect(screen.getByText("멤버 전용")).toBeTruthy();
    expect(screen.getByText("유료")).toBeTruthy();
  });

  it("shows empty state when no posts", () => {
    render(<PostCardList posts={[]} />);
    expect(screen.getByText(/아직 포스트가 없습니다/)).toBeTruthy();
  });

  it("renders post body when present", () => {
    const posts = [
      {
        id: "post-b",
        title: "본문 있는 포스트",
        body: "이것은 본문입니다",
        visibility: "PUBLIC" as const,
        priceKrw: null,
      },
    ];
    render(<PostCardList posts={posts} />);
    expect(screen.getByText("이것은 본문입니다")).toBeTruthy();
  });
});

describe("MembershipPlanCardList (FR-005)", () => {
  it("renders plan with price formatted as ₩ and CTA button", () => {
    const plans = [
      { id: "plan-1", title: "브론즈", description: null, priceKrw: 5000 },
    ];
    render(<MembershipPlanCardList plans={plans} isActiveMember={false} />);
    expect(screen.getByText("브론즈")).toBeTruthy();
    expect(screen.getByText(/5,000/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /멤버십 가입하기/ })).toBeTruthy();
  });

  it("renders plan description when present", () => {
    const plans = [
      {
        id: "plan-2",
        title: "실버",
        description: "상세 혜택 설명",
        priceKrw: 10000,
      },
    ];
    render(<MembershipPlanCardList plans={plans} isActiveMember={false} />);
    expect(screen.getByText("상세 혜택 설명")).toBeTruthy();
  });

  it("shows empty state when no plans", () => {
    render(<MembershipPlanCardList plans={[]} isActiveMember={false} />);
    expect(screen.getByText(/아직 멤버십 플랜이 없습니다/)).toBeTruthy();
  });
});

describe("ProgramCardList", () => {
  it("renders program card", () => {
    const programs = [
      { id: "prog-1", title: "데모 클래스", description: null, category: null, priceKrw: 30000 },
    ];
    render(<ProgramCardList programs={programs} />);
    expect(screen.getByText("데모 클래스")).toBeTruthy();
  });

  it("renders program with description and category", () => {
    const programs = [
      {
        id: "prog-2",
        title: "풀코스 클래스",
        description: "상세한 설명입니다",
        category: "워크숍",
        priceKrw: 50000,
      },
    ];
    render(<ProgramCardList programs={programs} />);
    expect(screen.getByText("상세한 설명입니다")).toBeTruthy();
    expect(screen.getByText("워크숍")).toBeTruthy();
    expect(screen.getByText(/50,000/)).toBeTruthy();
  });

  it("shows empty state when no programs", () => {
    render(<ProgramCardList programs={[]} />);
    expect(screen.getByText(/아직 프로그램이 없습니다/)).toBeTruthy();
  });
});

describe("StudioTabs", () => {
  const studioWithContent = {
    ...baseStudio,
    posts: [{ id: "post-1", title: "P1", body: "", visibility: "PUBLIC" as const, priceKrw: null }],
    plans: [{ id: "plan-1", title: "Pl1", description: null, priceKrw: 1000 }],
    programs: [{ id: "prog-1", title: "Pr1", description: null, category: null, priceKrw: 1000 }],
  };

  it("defaults to 소개 tab", () => {
    render(<StudioTabs studio={studioWithContent} creatorProfileId="p-1" />);
    // 소개 탭이 활성화되어 있고, 헤더의 스튜디오명이 보임
    expect(screen.getByRole("tab", { name: "소개" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("신진작가 스튜디오")).toBeTruthy();
  });

  it("switches to 포스트 tab and shows posts", () => {
    render(<StudioTabs studio={studioWithContent} creatorProfileId="p-1" />);
    fireEvent.click(screen.getByRole("tab", { name: /포스트/ }));
    expect(screen.getByText("P1")).toBeTruthy();
  });

  it("비권한 사용자에게 커뮤니티 격벽 안내를 표시한다 (SPEC-007 FR-002, AC-001)", () => {
    render(<StudioTabs studio={studioWithContent} creatorProfileId="p-1" canAccessCommunity={false} />);
    fireEvent.click(screen.getByRole("tab", { name: /커뮤니티/ }));
    expect(screen.getByText(/멤버십 가입 또는 프로그램 참여 시 열립니다/)).toBeTruthy();
  });

  it("권한 사용자에게 커뮤니티 글 목록과 작성 폼을 표시한다 (SPEC-007 FR-003, AC-002)", () => {
    render(
      <StudioTabs
        studio={studioWithContent}
        creatorProfileId="p-1"
        canAccessCommunity={true}
        communityPosts={[
          {
            id: "c-1",
            title: "커뮤니티 글",
            content: "내용",
            createdAt: new Date("2026-01-01"),
            author: { id: "u-1", name: "팬" },
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: /커뮤니티/ }));
    expect(screen.getByText("커뮤니티 글")).toBeTruthy();
    expect(screen.getByRole("button", { name: /글 작성/ })).toBeTruthy();
  });
});
