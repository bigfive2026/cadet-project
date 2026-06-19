// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

// prisma mock
const { mockPostFindUnique, mockMembershipFindFirst, mockPaymentFindFirst } = vi.hoisted(() => ({
  mockPostFindUnique: vi.fn(),
  mockMembershipFindFirst: vi.fn(),
  mockPaymentFindFirst: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: { findUnique: (...args: unknown[]) => mockPostFindUnique(...args) },
    membership: { findFirst: (...args: unknown[]) => mockMembershipFindFirst(...args) },
    payment: { findFirst: (...args: unknown[]) => mockPaymentFindFirst(...args) },
  },
}));

// getCurrentUser mock
const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

// next/navigation mock — notFound throws
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
  redirect: vi.fn(),
  // PurchaseButton(client)이 useRouter를 사용하므로 stub 제공.
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import PostPage from "@/app/(app)/posts/[id]/page";
import { render } from "@testing-library/react";

const PUBLIC_POST = {
  id: "post-public",
  title: "공개 포스트",
  body: "공개 본문 내용",
  visibility: "PUBLIC",
  creatorProfileId: "p-creator",
  priceKrw: null,
};
const MEMBER_POST = {
  id: "post-member",
  title: "멤버 전용 포스트",
  body: "비밀 본문",
  visibility: "MEMBER_ONLY",
  creatorProfileId: "p-creator",
  priceKrw: null,
};
const PAID_POST = {
  id: "post-paid",
  title: "유료 포스트",
  body: "유료 본문",
  visibility: "PAID",
  creatorProfileId: "p-creator",
  priceKrw: 5000,
};
const CREATOR_USER = {
  id: "u-creator",
  role: "CREATOR",
  creatorProfile: { id: "p-creator", studioName: "스튜디오", bio: null },
};
const FAN_USER = { id: "u-fan", role: "FAN", creatorProfile: null };

function makeParams(id: string) {
  return Promise.resolve({ id });
}

beforeEach(() => {
  mockPostFindUnique.mockReset();
  mockMembershipFindFirst.mockReset();
  mockPaymentFindFirst.mockReset();
  mockGetCurrentUser.mockReset();
});

describe("PostPage (FR-008~011, AC-001/002/004/005, NFR-002)", () => {
  it("포스트가 없으면 notFound()를 호출한다", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    mockPostFindUnique.mockResolvedValue(null);
    const page = PostPage({ params: makeParams("nonexistent") });
    await expect(page).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("PUBLIC 포스트: 비로그인 사용자도 전체 body를 볼 수 있다 (AC-004)", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    mockPostFindUnique.mockResolvedValue(PUBLIC_POST);
    const { container } = render(await PostPage({ params: makeParams("post-public") }));
    expect(container.textContent).toContain("공개 본문 내용");
    expect(container.textContent).not.toContain("멤버 전용 콘텐츠");
  });

  it("MEMBER_ONLY 포스트: 비멤버는 body를 받지 못하고 잠금 프리뷰를 본다 (AC-001, NFR-002)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    mockPostFindUnique.mockResolvedValue(MEMBER_POST);
    mockMembershipFindFirst.mockResolvedValue(null); // 비멤버
    const { container } = render(await PostPage({ params: makeParams("post-member") }));
    // NFR-002: body가 HTML에 포함되지 않아야 함
    expect(container.textContent).not.toContain("비밀 본문");
    expect(container.textContent).toContain("멤버 전용 콘텐츠입니다");
  });

  it("MEMBER_ONLY 포스트: 활성 멤버는 전체 body를 볼 수 있다 (AC-002)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    mockPostFindUnique.mockResolvedValue(MEMBER_POST);
    mockMembershipFindFirst.mockResolvedValue({ id: "m-1" }); // 멤버
    const { container } = render(await PostPage({ params: makeParams("post-member") }));
    expect(container.textContent).toContain("비밀 본문");
  });

  it("MEMBER_ONLY 포스트: 크리에이터 본인은 전체 body를 볼 수 있다 (AC-005)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR_USER);
    mockPostFindUnique.mockResolvedValue(MEMBER_POST);
    const { container } = render(await PostPage({ params: makeParams("post-member") }));
    expect(container.textContent).toContain("비밀 본문");
    // 작성자 본인 판정이므로 membership DB 조회 불필요
    expect(mockMembershipFindFirst).not.toHaveBeenCalled();
  });

  it("PAID 포스트: 비구매자는 잠금 UI와 '유료 콘텐츠' 라벨을 본다 (AC-001, NFR-002)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    mockPostFindUnique.mockResolvedValue(PAID_POST);
    mockPaymentFindFirst.mockResolvedValue(null); // 미구매
    const { container } = render(await PostPage({ params: makeParams("post-paid") }));
    // body가 노출되지 않아야 함 (NFR-002)
    expect(container.textContent).not.toContain("유료 본문");
    expect(container.textContent).toContain("유료 콘텐츠");
  });

  it("PAID 포스트: 구매자는 전체 body를 볼 수 있다 (SPEC-009 AC-003)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    mockPostFindUnique.mockResolvedValue(PAID_POST);
    mockPaymentFindFirst.mockResolvedValue({ id: "pay-1", status: "PAID" }); // 구매 완료
    const { container } = render(await PostPage({ params: makeParams("post-paid") }));
    expect(container.textContent).toContain("유료 본문");
  });

  it("PAID 포스트: 크리에이터 본인은 결제 없이 body를 볼 수 있다 (SPEC-009 AC-005)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR_USER);
    mockPostFindUnique.mockResolvedValue(PAID_POST);
    const { container } = render(await PostPage({ params: makeParams("post-paid") }));
    expect(container.textContent).toContain("유료 본문");
    // 작성자 본인 판정이므로 payment DB 조회 불필요
    expect(mockPaymentFindFirst).not.toHaveBeenCalled();
  });
});
