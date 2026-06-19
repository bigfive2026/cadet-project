import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { listNotifications, getUnreadNotificationCount } from "./notifications";

describe("queries/notifications (FR-014, AC-007)", () => {
  beforeEach(() => {
    mockPrisma.notification.findMany.mockReset();
    mockPrisma.notification.count.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  describe("listNotifications", () => {
    it("사용자의 알림 목록을 최신순으로 반환", async () => {
      const mockNotifications = [
        {
          id: "n-1",
          type: "APPLICATION_CREATED",
          message: "새로운 신청이 도착했습니다.",
          readAt: null,
          createdAt: new Date("2026-06-18"),
        },
        {
          id: "n-2",
          type: "PROGRAM_CLOSED",
          message: "프로그램 모집이 마감되었습니다.",
          readAt: new Date("2026-06-17"),
          createdAt: new Date("2026-06-17"),
        },
      ];
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await listNotifications("user-1");

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(mockNotifications);
    });

    it("빈 목록도 반환", async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      const result = await listNotifications("user-1");
      expect(result).toEqual([]);
    });
  });

  describe("getUnreadNotificationCount (FR-014, AC-007)", () => {
    it("읽지 않은 알림 수를 반환", async () => {
      mockPrisma.notification.count.mockResolvedValue(3);

      const result = await getUnreadNotificationCount("user-1");

      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: "user-1", readAt: null },
      });
      expect(result).toBe(3);
    });

    it("모두 읽었으면 0 반환", async () => {
      mockPrisma.notification.count.mockResolvedValue(0);
      const result = await getUnreadNotificationCount("user-1");
      expect(result).toBe(0);
    });
  });
});
