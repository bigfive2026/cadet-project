import { beforeEach, describe, expect, it, vi } from "vitest";

// --- vi.hoisted: mock 함수를 hoist ---
const { mockMembershipCreate, mockMembershipFindFirst, mockMembershipPlanFindUnique, mockPaymentCreate } =
  vi.hoisted(() => ({
    mockMembershipCreate: vi.fn(),
    mockMembershipFindFirst: vi.fn(),
    mockMembershipPlanFindUnique: vi.fn(),
    mockPaymentCreate: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    membershipPlan: {
      findUnique: (...args: unknown[]) => mockMembershipPlanFindUnique(...args),
    },
    membership: {
      create: (...args: unknown[]) => mockMembershipCreate(...args),
      findFirst: (...args: unknown[]) => mockMembershipFindFirst(...args),
    },
    payment: {
      create: (...args: unknown[]) => mockPaymentCreate(...args),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
      fn({
        membership: {
          create: (...args: unknown[]) => mockMembershipCreate(...args),
        },
        payment: {
          create: (...args: unknown[]) => mockPaymentCreate(...args),
        },
      }),
    ),
  },
}));

// getCurrentUser mock
const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

// mockPaymentProvider mock
vi.mock("@/lib/payment/provider", () => ({
  mockPaymentProvider: {
    charge: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// next/navigation mock
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

import { joinMembership } from "@/app/(app)/creators/[creatorId]/actions";

const FAN_USER = { id: "u-fan", role: "FAN", creatorProfile: null };
const PLAN = { priceKrw: 10000 };

beforeEach(() => {
  mockMembershipCreate.mockReset();
  mockMembershipFindFirst.mockReset();
  mockMembershipPlanFindUnique.mockReset();
  mockPaymentCreate.mockReset();
  mockGetCurrentUser.mockReset();
});

describe("joinMembership Server Action (FR-004, FR-005, FR-006, AC-002, AC-003, NFR-003)", () => {
  it("비로그인 시 에러를 던진다", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    await expect(joinMembership("plan-1")).rejects.toThrow();
    expect(mockMembershipCreate).not.toHaveBeenCalled();
  });

  it("팬이 멤버십에 성공적으로 가입하고 Membership을 반환하며 Payment를 생성한다 (FR-004, PRD §8.3)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    mockMembershipPlanFindUnique.mockResolvedValue(PLAN);
    const created = { id: "m-new", userId: "u-fan", planId: "plan-1" };
    mockMembershipCreate.mockResolvedValue(created);
    mockPaymentCreate.mockResolvedValue({ id: "pay-1" });

    const result = await joinMembership("plan-1");
    expect(result).toEqual(created);
    expect(mockMembershipCreate).toHaveBeenCalledWith({
      data: { userId: "u-fan", planId: "plan-1" },
    });
    expect(mockPaymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          membershipId: "m-new",
          fanUserId: "u-fan",
          amount: 10000,
          feeKrw: 1000,
          status: "PAID",
        }),
      }),
    );
  });

  it("이미 가입된 경우 P2002 에러를 잡고 기존 멤버십을 반환한다 (FR-005, AC-003, NFR-003)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    mockMembershipPlanFindUnique.mockResolvedValue(PLAN);
    const p2002Error = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
    mockMembershipCreate.mockRejectedValue(p2002Error);

    const existing = { id: "m-existing", userId: "u-fan", planId: "plan-1" };
    mockMembershipFindFirst.mockResolvedValue(existing);

    const result = await joinMembership("plan-1");
    expect(result).toEqual(existing);
    expect(mockMembershipFindFirst).toHaveBeenCalledWith({
      where: { userId: "u-fan", planId: "plan-1" },
    });
  });

  it("P2002 외 다른 에러는 재던진다", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    mockMembershipPlanFindUnique.mockResolvedValue(PLAN);
    const otherError = Object.assign(new Error("DB error"), { code: "P9999" });
    mockMembershipCreate.mockRejectedValue(otherError);

    await expect(joinMembership("plan-1")).rejects.toThrow("DB error");
  });
});
