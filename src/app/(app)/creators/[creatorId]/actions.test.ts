import { beforeEach, describe, expect, it, vi } from "vitest";

// --- vi.hoisted: notFound/redirect가 throw하므로 hoist 필요 ---
const { mockCreate, mockFindFirst } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

// getCurrentUser mock
const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

// next/navigation mock (redirect는 throw하지 않음 — 서버 액션에서 사용 안 함)
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

import { joinMembership } from "@/app/(app)/creators/[creatorId]/actions";

const FAN_USER = { id: "u-fan", role: "FAN", creatorProfile: null };

beforeEach(() => {
  mockCreate.mockReset();
  mockFindFirst.mockReset();
  mockGetCurrentUser.mockReset();
});

describe("joinMembership Server Action (FR-004, FR-005, FR-006, AC-002, AC-003, NFR-003)", () => {
  it("비로그인 시 에러를 던진다", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    await expect(joinMembership("plan-1")).rejects.toThrow();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("팬이 멤버십에 성공적으로 가입하고 새 Membership을 반환한다 (FR-004)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    const created = { id: "m-new", userId: "u-fan", planId: "plan-1" };
    mockCreate.mockResolvedValue(created);

    const result = await joinMembership("plan-1");
    expect(result).toEqual(created);
    expect(mockCreate).toHaveBeenCalledWith({
      data: { userId: "u-fan", planId: "plan-1" },
    });
  });

  it("이미 가입된 경우 P2002 에러를 잡고 기존 멤버십을 반환한다 (FR-005, AC-003, NFR-003)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    // P2002 에러 시뮬레이션
    const p2002Error = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    mockCreate.mockRejectedValue(p2002Error);

    const existing = { id: "m-existing", userId: "u-fan", planId: "plan-1" };
    mockFindFirst.mockResolvedValue(existing);

    const result = await joinMembership("plan-1");
    expect(result).toEqual(existing);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { userId: "u-fan", planId: "plan-1" },
    });
  });

  it("P2002 외 다른 에러는 재던진다", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    const otherError = Object.assign(new Error("DB error"), { code: "P9999" });
    mockCreate.mockRejectedValue(otherError);

    await expect(joinMembership("plan-1")).rejects.toThrow("DB error");
  });
});
