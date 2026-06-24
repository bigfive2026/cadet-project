// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockListCreators = vi.fn();
const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/queries/studio", () => ({
  listCreators: (...args: unknown[]) => mockListCreators(...args),
}));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

import CreatorsPage from "@/app/(app)/creators/page";

beforeEach(() => {
  mockListCreators.mockReset();
  mockGetCurrentUser.mockReset();
  mockGetCurrentUser.mockResolvedValue(null);
});
afterEach(() => vi.clearAllMocks());

describe("/creators list page (AC-001)", () => {
  it("renders >=2 creator cards from seeded data", async () => {
    mockListCreators.mockResolvedValue([
      { id: "p-1", studioName: "스튜디오 1", bio: null, profileImageUrl: null, category: null },
      { id: "p-2", studioName: "스튜디오 2", bio: "작가2", profileImageUrl: null, category: "회화" },
    ]);
    const ui = await CreatorsPage({});
    render(ui);
    expect(screen.getByText("스튜디오 1")).toBeTruthy();
    expect(screen.getByText("스튜디오 2")).toBeTruthy();
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it("작가가 많으면 첫 화면은 6명만 보여주고 더 보기 링크를 제공한다", async () => {
    mockListCreators.mockResolvedValue(
      Array.from({ length: 8 }, (_, index) => ({
        id: `p-${index + 1}`,
        studioName: `스튜디오 ${index + 1}`,
        bio: null,
        profileImageUrl: null,
        category: index % 2 === 0 ? "회화" : "도자",
      })),
    );

    const ui = await CreatorsPage({});
    render(ui);

    expect(screen.getByText("스튜디오 1")).toBeTruthy();
    expect(screen.getByText("스튜디오 6")).toBeTruthy();
    expect(screen.queryByText("스튜디오 7")).toBeNull();
    expect(screen.getByRole("link", { name: "2명 더 보기" })).toHaveAttribute(
      "href",
      "/creators?limit=8",
    );
  });

  it("tab=artworks 진입 시 작품 구매 목록 제목과 작품 탭 링크를 렌더링한다", async () => {
    mockListCreators.mockResolvedValue([
      { id: "p-1", studioName: "스튜디오 1", bio: null, profileImageUrl: null, category: null },
    ]);
    const ui = await CreatorsPage({
      searchParams: Promise.resolve({ tab: "artworks" }),
    });
    render(ui);

    expect(screen.getByText("작품 구매 가능한 크리에이터")).toBeTruthy();
    expect(screen.getByRole("link", { name: /스튜디오 1/ })).toHaveAttribute(
      "href",
      "/creators/p-1?tab=artworks",
    );
  });
});
