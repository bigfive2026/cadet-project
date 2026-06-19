import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockMembershipFindMany = vi.fn();
const mockApplicationFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findMany: (...args: unknown[]) => mockMembershipFindMany(...args),
    },
    programApplication: {
      findMany: (...args: unknown[]) => mockApplicationFindMany(...args),
    },
  },
}));

import {
  listActiveMembers,
  listProgramParticipants,
  listMyMemberships,
} from "@/lib/queries/members";

beforeEach(() => {
  mockMembershipFindMany.mockReset();
  mockApplicationFindMany.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("listActiveMembers (FR-008, NFR-002)", () => {
  it("해당 크리에이터의 멤버를 user/plan 포함하여 단일 쿼리로 조회한다 (N+1 회피)", async () => {
    const rows = [
      { id: "m-1", user: { id: "u-1", name: "팬" }, plan: { id: "pl-1", title: "브론즈" } },
    ];
    mockMembershipFindMany.mockResolvedValue(rows);

    const result = await listActiveMembers("p-1");

    expect(result).toEqual(rows);
    expect(mockMembershipFindMany).toHaveBeenCalledTimes(1);
    const call = mockMembershipFindMany.mock.calls[0][0];
    expect(call.where).toEqual({ plan: { creatorProfileId: "p-1" } });
    expect(call.include.user.select).toEqual({ id: true, name: true });
    expect(call.include.plan.select).toEqual({ id: true, title: true });
    expect(call.orderBy).toEqual({ startedAt: "desc" });
  });
});

describe("listProgramParticipants (FR-009, AC-007)", () => {
  it("ACCEPTED 신청자만 user/contract.payments 포함하여 조회한다", async () => {
    const rows = [
      {
        id: "app-1",
        user: { id: "u-1", name: "팬" },
        contract: { payments: [{ status: "PAID" }] },
      },
    ];
    mockApplicationFindMany.mockResolvedValue(rows);

    const result = await listProgramParticipants("prog-1");

    expect(result).toEqual(rows);
    const call = mockApplicationFindMany.mock.calls[0][0];
    expect(call.where).toEqual({ programId: "prog-1", status: "ACCEPTED" });
    expect(call.include.user.select).toEqual({ id: true, name: true });
    expect(call.include.contract.include.payments.select).toEqual({ status: true });
  });
});

describe("listMyMemberships (FR-011, AC-008)", () => {
  it("본인 멤버십을 plan.creatorProfile 포함하여 최신순으로 조회한다", async () => {
    const rows = [
      {
        id: "m-1",
        plan: { id: "pl-1", title: "브론즈", creatorProfile: { id: "p-1", studioName: "스튜디오" } },
      },
    ];
    mockMembershipFindMany.mockResolvedValue(rows);

    const result = await listMyMemberships("u-1");

    expect(result).toEqual(rows);
    const call = mockMembershipFindMany.mock.calls[0][0];
    expect(call.where).toEqual({ userId: "u-1" });
    expect(call.include.plan.include.creatorProfile.select).toEqual({
      id: true,
      studioName: true,
    });
    expect(call.orderBy).toEqual({ startedAt: "desc" });
  });
});
