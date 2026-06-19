import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    notification: {
      updateMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { markNotificationRead, markAllNotificationsRead } from "./notifications";

describe("lib/notifications (FR-014, AC-009)", () => {
  beforeEach(() => {
    mockPrisma.notification.updateMany.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  describe("markNotificationRead", () => {
    it("본인 알림을 읽음으로 표시", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });

      const result = await markNotificationRead("user-1", "notif-1");

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: "notif-1", userId: "user-1" },
        data: { readAt: expect.any(Date) },
      });
      expect(result.ok).toBe(true);
    });

    it("존재하지 않는 알림이어도 ok:true 반환", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await markNotificationRead("user-1", "notif-1");

      expect(result.ok).toBe(true);
    });

    it("타인 알림은 업데이트되지 않음 (권한)", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

      await markNotificationRead("user-1", "notif-1");

      // where 조건에 userId가 포함되어 있어서 타인 알림은 업데이트 안됨
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "notif-1", userId: "user-1" },
        }),
      );
    });
  });

  describe("markAllNotificationsRead (FR-014, AC-009)", () => {
    it("모든 읽지 않은 알림을 읽음으로 표시", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await markAllNotificationsRead("user-1");

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", readAt: null },
        data: { readAt: expect.any(Date) },
      });
      expect(result).toBe(3);
    });

    it("읽지 않은 알림이 없으면 0 반환", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await markAllNotificationsRead("user-1");

      expect(result).toBe(0);
    });
  });
});
