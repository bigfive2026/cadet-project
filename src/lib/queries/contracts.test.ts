import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    contract: { findUnique: vi.fn() },
    payment: { findMany: vi.fn() },
    programApplication: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import {
  getContractDetail,
  listFanPayments,
  listFanAcceptedApplications,
} from "./contracts";

describe("queries/contracts (SPEC-006)", () => {
  beforeEach(() => {
    mockPrisma.contract.findUnique.mockReset();
    mockPrisma.payment.findMany.mockReset();
    mockPrisma.programApplication.findMany.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it("getContractDetail은 contractId로 application/program/payments를 포함해 조회한다", () => {
    mockPrisma.contract.findUnique.mockReturnValue("contract");
    expect(getContractDetail("c1")).toBe("contract");
    const arg = mockPrisma.contract.findUnique.mock.calls[0][0];
    expect(arg.where).toEqual({ id: "c1" });
    expect(arg.include.application).toBeDefined();
    expect(arg.include.payments).toBeDefined();
  });

  it("listFanPayments는 계약 결제(contractId not null)만 최신순으로 조회한다", () => {
    mockPrisma.payment.findMany.mockReturnValue("payments");
    expect(listFanPayments("fan-1")).toBe("payments");
    const arg = mockPrisma.payment.findMany.mock.calls[0][0];
    expect(arg.where.fanUserId).toBe("fan-1");
    expect(arg.where.contractId).toEqual({ not: null });
    expect(arg.orderBy).toEqual({ createdAt: "desc" });
  });

  it("listFanAcceptedApplications는 팬의 ACCEPTED 신청을 조회한다", () => {
    mockPrisma.programApplication.findMany.mockReturnValue("apps");
    expect(listFanAcceptedApplications("fan-1")).toBe("apps");
    const arg = mockPrisma.programApplication.findMany.mock.calls[0][0];
    expect(arg.where).toMatchObject({ userId: "fan-1", status: "ACCEPTED" });
  });
});
