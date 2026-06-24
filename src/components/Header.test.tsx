// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@/components/notification/NotificationBell", () => ({
  NotificationBell: () => <a href="/notifications">알림</a>,
}));

vi.mock("@/components/UserMenu", () => ({
  UserMenu: ({ name, creatorProfileId }: { name: string; creatorProfileId?: string }) => (
    <button type="button">{creatorProfileId ? `${name}:${creatorProfileId}` : name}</button>
  ),
}));

import { Header } from "@/components/Header";

beforeEach(() => {
  vi.clearAllMocks();
});

function expectLink(name: string, href: string) {
  expect(
    screen.getAllByRole("link", { name }).some((link) => link.getAttribute("href") === href),
  ).toBe(true);
}

describe("Header GNB", () => {
  it("미인증 사용자는 공개 탐색과 크리에이터 시작 CTA를 본다", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    render(await Header());

    expectLink("작가 찾기", "/creators");
    expectLink("작품 보기", "/creators?tab=artworks");
    expectLink("프로그램", "/programs");
    expectLink("이용 안내", "/support");
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "크리에이터 시작" })).toHaveAttribute("href", "/signup");
    expect(screen.getAllByRole("link", { name: "작품 보기" })).toHaveLength(2);
    expect(screen.queryByText("회원가입")).toBeNull();
  });

  it("팬은 발견/구매 중심 GNB와 우측 마이페이지 링크를 본다", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "fan-1", name: "팬", role: "FAN" });

    render(await Header());

    expectLink("내 홈", "/dashboard/fan");
    expectLink("둘러보기", "/creators");
    expectLink("프로그램", "/programs");
    expectLink("관심 작가", "/dashboard/fan/bookmarks");
    expectLink("내 멤버십", "/dashboard/fan/memberships");
    expectLink("내 신청·결제", "/dashboard/fan/payments");
    expect(screen.queryByText("내 정보")).toBeNull();
    expect(screen.queryByText("내 활동")).toBeNull();
  });

  it("크리에이터는 운영, 주문 배송, 정산 중심 GNB를 본다", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "creator-1",
      name: "작가",
      role: "CREATOR",
      creatorProfile: { id: "cp-1" },
    });

    render(await Header());

    expectLink("홈", "/");
    expectLink("내 프로필", "/creators/cp-1");
    expectLink("관리 홈", "/dashboard/creator");
    expectLink("작품", "/dashboard/creator/artworks");
    expectLink("작업", "/dashboard/creator/works");
    expectLink("프로그램", "/dashboard/creator/programs");
    expectLink("주문·배송", "/dashboard/creator/artwork-orders");
    expectLink("정산", "/dashboard/creator/settlements");
    expect(screen.getByRole("button", { name: "작가:cp-1" })).toBeTruthy();
    expect(screen.queryByText("포스트 작성")).toBeNull();
  });
});
