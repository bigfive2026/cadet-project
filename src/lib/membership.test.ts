import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Prisma mock ---
const mockFindFirst = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
  },
}));

import { isActiveMember } from "@/lib/membership";

beforeEach(() => {
  mockFindFirst.mockReset();
});

describe("isActiveMember (FR-007, AC-008)", () => {
  it("팬이 해당 크리에이터의 플랜에 멤버십이 있으면 true를 반환한다", async () => {
    mockFindFirst.mockResolvedValue({ id: "m-1" });
    const result = await isActiveMember("u-fan", "p-creator");
    expect(result).toBe(true);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        userId: "u-fan",
        plan: { creatorProfileId: "p-creator" },
      },
    });
  });

  it("멤버십 레코드가 없으면 false를 반환한다", async () => {
    mockFindFirst.mockResolvedValue(null);
    const result = await isActiveMember("u-fan", "p-creator");
    expect(result).toBe(false);
  });

  it("다른 크리에이터의 플랜에 가입된 팬은 false를 반환한다 (AC-008 Y에 대한 false)", async () => {
    // 팬 A는 크리에이터 X에 가입 → 크리에이터 Y에 대해서는 false
    mockFindFirst.mockResolvedValue(null);
    const result = await isActiveMember("u-fan", "p-other-creator");
    expect(result).toBe(false);
  });
});
