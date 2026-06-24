import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    programApplication: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { listApplicationsForCreator, findActiveApplication, listMyApplications } from "./applications";

describe("queries/applications (FR-002, AC-002)", () => {
  beforeEach(() => {
    mockPrisma.programApplication.findMany.mockReset();
    mockPrisma.programApplication.findFirst.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  describe("listApplicationsForCreator", () => {
    it("프로그램의 모든 신청을 최신순으로 반환", async () => {
      const mockApplications = [
        {
          id: "app-1",
          status: "PENDING",
          user: { id: "u-1", name: "팬1" },
          createdAt: new Date("2026-06-18"),
        },
        {
          id: "app-2",
          status: "ACCEPTED",
          user: { id: "u-2", name: "팬2" },
          createdAt: new Date("2026-06-17"),
        },
      ];
      mockPrisma.programApplication.findMany.mockResolvedValue(mockApplications);

      const result = await listApplicationsForCreator("prog-1");

      expect(mockPrisma.programApplication.findMany).toHaveBeenCalledWith({
        where: { programId: "prog-1" },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(mockApplications);
    });

    it("빈 목록도 반환", async () => {
      mockPrisma.programApplication.findMany.mockResolvedValue([]);
      const result = await listApplicationsForCreator("prog-1");
      expect(result).toEqual([]);
    });
  });

  describe("findActiveApplication (FR-002, AC-002)", () => {
    it("PENDING 상태 신청이 있으면 반환", async () => {
      const mockApp = {
        id: "app-1",
        status: "PENDING",
        programId: "prog-1",
        userId: "u-1",
      };
      mockPrisma.programApplication.findFirst.mockResolvedValue(mockApp);

      const result = await findActiveApplication("prog-1", "u-1");

      expect(mockPrisma.programApplication.findFirst).toHaveBeenCalledWith({
        where: {
          programId: "prog-1",
          userId: "u-1",
          status: { in: ["PENDING", "RESERVED", "PENDING_PAYMENT", "ACCEPTED"] },
        },
        include: { payment: { select: { amount: true, status: true } } },
      });
      expect(result).toEqual(mockApp);
    });

    it("ACCEPTED 상태 신청도 활성으로 간주", async () => {
      const mockApp = {
        id: "app-1",
        status: "ACCEPTED",
        programId: "prog-1",
        userId: "u-1",
      };
      mockPrisma.programApplication.findFirst.mockResolvedValue(mockApp);

      const result = await findActiveApplication("prog-1", "u-1");
      expect(result).toEqual(mockApp);
    });

    it("REJECTED 상태는 활성이 아님", async () => {
      mockPrisma.programApplication.findFirst.mockResolvedValue(null);

      const result = await findActiveApplication("prog-1", "u-1");
      expect(result).toBeNull();
    });

    it("신청이 없으면 null 반환", async () => {
      mockPrisma.programApplication.findFirst.mockResolvedValue(null);

      const result = await findActiveApplication("prog-1", "u-1");
      expect(result).toBeNull();
    });
  });

  describe("listMyApplications", () => {
    it("팬 본인의 전체 신청을 최신 업데이트순으로 반환", async () => {
      const mockApps = [
        {
          id: "app-1",
          status: "PENDING",
          program: { id: "prog-1", title: "클래스 A", priceKrw: 30000, status: "RECRUITING" },
        },
        {
          id: "app-2",
          status: "REJECTED",
          program: { id: "prog-2", title: "클럽 B", priceKrw: 20000, status: "CLOSED" },
        },
      ];
      mockPrisma.programApplication.findMany.mockResolvedValue(mockApps);

      const result = await listMyApplications("u-fan");

      expect(mockPrisma.programApplication.findMany).toHaveBeenCalledWith({
        where: { userId: "u-fan" },
        orderBy: { updatedAt: "desc" },
        include: {
          program: {
            select: {
              id: true,
              title: true,
              priceKrw: true,
              status: true,
              reviews: { where: { userId: "u-fan" }, select: { id: true }, take: 1 },
            },
          },
          payment: { select: { status: true, createdAt: true, updatedAt: true } },
        },
      });
      expect(result).toEqual(mockApps);
    });

    it("신청이 없으면 빈 목록 반환", async () => {
      mockPrisma.programApplication.findMany.mockResolvedValue([]);
      const result = await listMyApplications("u-fan");
      expect(result).toEqual([]);
    });
  });
});
