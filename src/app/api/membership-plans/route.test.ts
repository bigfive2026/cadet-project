import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Prisma mock ---
const mockCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    membershipPlan: { create: (...args: unknown[]) => mockCreate(...args) },
  },
}));

// --- getCurrentUser mock ---
const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));

import { POST } from "@/app/api/membership-plans/route";

const CREATOR_USER = {
  id: "u-creator",
  role: "CREATOR",
  creatorProfile: { id: "p-creator", studioName: "스튜디오", bio: null },
};
const FAN_USER = { id: "u-fan", role: "FAN", creatorProfile: null };

function makeReq(body: unknown) {
  return new Request("http://localhost/api/membership-plans", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockCreate.mockReset();
  mockGetCurrentUser.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("POST /api/membership-plans (FR-001, FR-002, AC-009)", () => {
  it("비로그인 시 401을 반환한다", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await POST(makeReq({ title: "플랜", priceKrw: 5000 }));
    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("비크리에이터(FAN) 요청 시 403을 반환한다 (AC-009)", async () => {
    mockGetCurrentUser.mockResolvedValue(FAN_USER);
    const res = await POST(makeReq({ title: "플랜", priceKrw: 5000 }));
    expect(res.status).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("크리에이터 프로필이 없으면 403을 반환한다", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "u-c", role: "CREATOR", creatorProfile: null });
    const res = await POST(makeReq({ title: "플랜", priceKrw: 5000 }));
    expect(res.status).toBe(403);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("Zod 검증 실패 시 400을 반환한다", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR_USER);
    const res = await POST(makeReq({ title: "플랜", priceKrw: 0 })); // priceKrw: 0 → 실패
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("유효한 요청으로 MembershipPlan을 생성하고 201을 반환한다 (FR-001)", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR_USER);
    const created = { id: "plan-new", title: "브론즈", priceKrw: 5000, creatorProfileId: "p-creator" };
    mockCreate.mockResolvedValue(created);

    const res = await POST(makeReq({ title: "브론즈", priceKrw: 5000 }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("plan-new");
    expect(mockCreate).toHaveBeenCalledWith({
      data: { title: "브론즈", priceKrw: 5000, creatorProfileId: "p-creator" },
    });
  });

  it("description을 포함한 요청도 처리한다", async () => {
    mockGetCurrentUser.mockResolvedValue(CREATOR_USER);
    const created = { id: "plan-x", title: "실버", priceKrw: 10000, description: "실버 혜택", creatorProfileId: "p-creator" };
    mockCreate.mockResolvedValue(created);

    const res = await POST(makeReq({ title: "실버", priceKrw: 10000, description: "실버 혜택" }));
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith({
      data: { title: "실버", priceKrw: 10000, description: "실버 혜택", creatorProfileId: "p-creator" },
    });
  });
});
