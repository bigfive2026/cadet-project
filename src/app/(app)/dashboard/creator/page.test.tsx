// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockRequireRole = vi.fn();
const mockGetCreatorStudio = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));
vi.mock("@/lib/queries/studio", () => ({
  getCreatorStudio: (...args: unknown[]) => mockGetCreatorStudio(...args),
}));

import CreatorDashboardPage from "@/app/(app)/dashboard/creator/page";

const creatorUser = {
  id: "u-1",
  email: "creator@artbridge.demo",
  name: "데모 크리에이터",
  role: "CREATOR",
  creatorProfile: {
    id: "p-1",
    studioName: "신진작가 스튜디오",
    bio: "작가 소개",
    category: "회화",
    coverImageUrl: null,
    profileImageUrl: null,
    instagramUrl: null,
    websiteUrl: null,
  },
};

beforeEach(() => {
  mockRequireRole.mockReset();
  mockGetCreatorStudio.mockReset();
  mockRequireRole.mockResolvedValue(creatorUser);
  mockGetCreatorStudio.mockResolvedValue({
    ...creatorUser.creatorProfile,
    posts: [],
    plans: [],
    programs: [],
  });
});
afterEach(() => vi.clearAllMocks());

describe("/dashboard/creator (AC-004)", () => {
  it("renders studio summary with studioName", async () => {
    const ui = await CreatorDashboardPage();
    render(ui);
    expect(screen.getByText("신진작가 스튜디오")).toBeTruthy();
  });

  it("renders 포스트 작성 link (AC-004)", async () => {
    const ui = await CreatorDashboardPage();
    render(ui);
    const postLink = screen.getByRole("link", { name: /포스트 작성/ });
    expect(postLink).toHaveAttribute("href");
  });

  it("renders separated artwork and work management links", async () => {
    const ui = await CreatorDashboardPage();
    render(ui);
    expect(screen.getByRole("link", { name: /작품 관리/ })).toHaveAttribute(
      "href",
      "/dashboard/creator/artworks",
    );
    expect(screen.getByRole("link", { name: /작업 관리/ })).toHaveAttribute(
      "href",
      "/dashboard/creator/works",
    );
  });

  it("renders 프로그램 만들기 link (AC-004)", async () => {
    const ui = await CreatorDashboardPage();
    render(ui);
    const progLink = screen.getByRole("link", { name: /프로그램 만들기/ });
    expect(progLink).toHaveAttribute("href");
  });

  it("renders 스튜디오 편집 link", async () => {
    const ui = await CreatorDashboardPage();
    render(ui);
    expect(screen.getByRole("link", { name: /스튜디오 편집/ })).toBeTruthy();
  });

  it("renders 멤버십 관리 link (REQ-1-009, AC-1-009)", async () => {
    const ui = await CreatorDashboardPage();
    render(ui);
    const link = screen.getByRole("link", { name: /멤버십 관리/ });
    expect(link).toHaveAttribute("href", "/dashboard/creator/memberships");
  });

  it("renders 내 커뮤니티 link (REQ-3-002, AC-3-002)", async () => {
    const ui = await CreatorDashboardPage();
    render(ui);
    const link = screen.getByRole("link", { name: /내 커뮤니티/ });
    expect(link).toHaveAttribute("href", "/creators/p-1?tab=community");
  });

  it("does not render settlement shortcut because settlement is handled by the GNB", async () => {
    const ui = await CreatorDashboardPage();
    render(ui);
    expect(screen.queryByRole("link", { name: /정산 관리/ })).toBeNull();
  });
});
