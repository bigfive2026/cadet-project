// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockGetCreatorStudio, mockNotFound } = vi.hoisted(() => ({
  mockGetCreatorStudio: vi.fn(),
  mockNotFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("@/lib/queries/studio", () => ({
  getCreatorStudio: (...args: unknown[]) => mockGetCreatorStudio(...args),
}));

vi.mock("next/navigation", () => ({ notFound: mockNotFound }));

// SPEC-003: getCurrentUser + isActiveMember mock 추가
const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

const mockIsActiveMember = vi.fn();
vi.mock("@/lib/membership", () => ({
  isActiveMember: (...args: unknown[]) => mockIsActiveMember(...args),
}));

// joinMembership Server Action mock
vi.mock("@/app/(app)/creators/[creatorId]/actions", () => ({
  joinMembership: vi.fn(),
}));

import CreatorDetailPage from "@/app/(app)/creators/[creatorId]/page";

beforeEach(() => {
  mockGetCreatorStudio.mockReset();
  mockNotFound.mockClear();
  mockGetCurrentUser.mockResolvedValue(null); // 기본: 비로그인
  mockIsActiveMember.mockResolvedValue(false); // 기본: 비멤버
});
afterEach(() => vi.clearAllMocks());

describe("/creators/[creatorId] (AC-002, AC-003, AC-007)", () => {
  const studio = {
    id: "p-1",
    studioName: "신진작가 스튜디오",
    bio: "작가 소개",
    category: "회화",
    coverImageUrl: null,
    profileImageUrl: null,
    instagramUrl: null,
    websiteUrl: null,
    posts: [
      { id: "post-1", title: "공개 포스트", body: "b1", visibility: "PUBLIC", priceKrw: null },
      { id: "post-2", title: "멤버 포스트", body: "b2", visibility: "MEMBER_ONLY", priceKrw: null },
    ],
    plans: [
      { id: "plan-1", title: "브론즈", description: null, priceKrw: 5000 },
    ],
    programs: [],
  };

  it("renders studioName, bio and tabs", async () => {
    mockGetCreatorStudio.mockResolvedValue(studio);
    const ui = await CreatorDetailPage({ params: Promise.resolve({ creatorId: "p-1" }) });
    render(ui);
    expect(screen.getByText("신진작가 스튜디오")).toBeTruthy();
    expect(screen.getAllByText("작가 소개").length).toBeGreaterThan(0);
    expect(screen.getByRole("tab", { name: "포스트" })).toBeTruthy();
  });

  it("renders >=2 posts with visibility badges (AC-002)", async () => {
    mockGetCreatorStudio.mockResolvedValue(studio);
    const ui = await CreatorDetailPage({ params: Promise.resolve({ creatorId: "p-1" }) });
    render(ui);
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.click(screen.getByRole("tab", { name: "포스트" }));
    expect(screen.getByText("공개 포스트")).toBeTruthy();
    expect(screen.getByText("멤버 포스트")).toBeTruthy();
    expect(screen.getAllByText("공개").length).toBeGreaterThan(0);
    expect(screen.getAllByText("멤버 전용").length).toBeGreaterThan(0);
  });

  it("renders membership plan card with price and CTA (AC-003) — 비멤버에게 가입하기 버튼", async () => {
    mockGetCreatorStudio.mockResolvedValue(studio);
    mockIsActiveMember.mockResolvedValue(false);
    const ui = await CreatorDetailPage({ params: Promise.resolve({ creatorId: "p-1" }) });
    render(ui);
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.click(screen.getByRole("tab", { name: "멤버십" }));
    expect(screen.getByText("브론즈")).toBeTruthy();
    expect(screen.getByText(/5,000/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /멤버십 가입하기/ })).toBeTruthy();
  });

  it("이미 멤버인 사용자에게 '멤버십 가입 완료' 비활성 버튼 표시 (AC-003, FR-006)", async () => {
    mockGetCreatorStudio.mockResolvedValue(studio);
    mockGetCurrentUser.mockResolvedValue({ id: "u-fan", role: "FAN", creatorProfile: null });
    mockIsActiveMember.mockResolvedValue(true);
    const ui = await CreatorDetailPage({ params: Promise.resolve({ creatorId: "p-1" }) });
    render(ui);
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.click(screen.getByRole("tab", { name: "멤버십" }));
    const btn = screen.getByRole("button", { name: "멤버십 가입 완료" });
    expect(btn).toBeTruthy();
    expect(btn).toBeDisabled();
  });

  it("calls notFound when studio is null (AC-007)", async () => {
    mockGetCreatorStudio.mockResolvedValue(null);
    await expect(
      CreatorDetailPage({ params: Promise.resolve({ creatorId: "ghost" }) }),
    ).rejects.toThrow("NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalled();
  });
});
