import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- isActiveMember mock ---
const mockIsActiveMember = vi.fn();
vi.mock("@/lib/membership", () => ({
  isActiveMember: (...args: unknown[]) => mockIsActiveMember(...args),
}));

// --- prisma mock ---
const mockApplicationFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    programApplication: {
      findFirst: (...args: unknown[]) => mockApplicationFindFirst(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}));

import { canAccessCommunity } from "@/lib/community-access";

beforeEach(() => {
  mockIsActiveMember.mockReset();
  mockApplicationFindFirst.mockReset();
  mockUserFindUnique.mockReset();
  // 기본값: 모든 경로 false
  mockIsActiveMember.mockResolvedValue(false);
  mockApplicationFindFirst.mockResolvedValue(null);
  mockUserFindUnique.mockResolvedValue(null);
});
afterEach(() => vi.clearAllMocks());

describe("canAccessCommunity (FR-001, AC-002, AC-003)", () => {
  it("활성 멤버이면 true를 반환한다 (AC-002)", async () => {
    mockIsActiveMember.mockResolvedValue(true);
    const result = await canAccessCommunity("u-fan", "p-creator");
    expect(result).toBe(true);
    expect(mockIsActiveMember).toHaveBeenCalledWith("u-fan", "p-creator");
  });

  it("결제 완료(PAID) 참여자이면 활성 멤버가 아니어도 true를 반환한다 (AC-003)", async () => {
    mockIsActiveMember.mockResolvedValue(false);
    mockApplicationFindFirst.mockResolvedValue({ id: "app-1" });
    const result = await canAccessCommunity("u-fan", "p-creator");
    expect(result).toBe(true);
  });

  it("결제 완료 참여자 판정은 ACCEPTED + PAID/RELEASED 조건으로 조회한다", async () => {
    mockApplicationFindFirst.mockResolvedValue({ id: "app-1" });
    await canAccessCommunity("u-fan", "p-creator");
    const call = mockApplicationFindFirst.mock.calls[0][0];
    expect(call.where.userId).toBe("u-fan");
    expect(call.where.status).toBe("ACCEPTED");
    expect(call.where.program).toEqual({ creatorProfileId: "p-creator" });
    expect(call.where.contract.payments.some.status).toEqual({
      in: ["PAID", "RELEASED"],
    });
  });

  it("소유 크리에이터 본인이면 true를 반환한다", async () => {
    mockUserFindUnique.mockResolvedValue({
      role: "CREATOR",
      creatorProfile: { id: "p-creator" },
    });
    const result = await canAccessCommunity("u-creator", "p-creator");
    expect(result).toBe(true);
  });

  it("다른 크리에이터(비소유)는 소유 경로로 통과하지 못한다", async () => {
    mockUserFindUnique.mockResolvedValue({
      role: "CREATOR",
      creatorProfile: { id: "p-other" },
    });
    const result = await canAccessCommunity("u-creator", "p-creator");
    expect(result).toBe(false);
  });

  it("멤버·참여·소유 어디에도 해당하지 않으면 false를 반환한다 (AC-001)", async () => {
    const result = await canAccessCommunity("u-fan", "p-creator");
    expect(result).toBe(false);
  });

  it("활성 멤버이면 결제 참여 쿼리를 호출하지 않는다 (단락 평가)", async () => {
    mockIsActiveMember.mockResolvedValue(true);
    await canAccessCommunity("u-fan", "p-creator");
    expect(mockApplicationFindFirst).not.toHaveBeenCalled();
  });
});
