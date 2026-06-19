// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { NotificationList } from "@/components/notification/NotificationList";

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  Bell: () => <span data-testid="bell-icon">Bell</span>,
  Check: () => <span data-testid="check-icon">Check</span>,
  X: () => <span data-testid="x-icon">X</span>,
  AlertCircle: () => <span data-testid="alert-icon">Alert</span>,
}));

// Mock fetch
global.fetch = vi.fn();

describe("NotificationList (FR-014, AC-006)", () => {
  const mockNotifications = [
    {
      id: "notif1",
      type: "APPLICATION_CREATED",
      message: "새로운 신청이 도착했습니다.",
      linkUrl: "/dashboard/creator/programs/prog1/applications",
      readAt: null,
      createdAt: "2026-01-15T10:00:00Z",
    },
    {
      id: "notif2",
      type: "APPLICATION_ACCEPTED",
      message: "신청이 수락되었습니다.",
      linkUrl: "/dashboard/creator/programs/prog1/applications",
      readAt: "2026-01-14T12:00:00Z",
      createdAt: "2026-01-14T10:00:00Z",
    },
  ];

  it("빈 목록일 경우 안내 메시지를 렌더링한다", () => {
    render(<NotificationList notifications={[]} />);
    expect(screen.getByText("알림이 없습니다.")).toBeTruthy();
  });

  it("알림 목록을 렌더링한다", () => {
    render(<NotificationList notifications={mockNotifications} />);

    expect(screen.getByText("새로운 신청이 도착했습니다.")).toBeTruthy();
    expect(screen.getByText("신청이 수락되었습니다.")).toBeTruthy();
  });

  it("미읽음 알림은 하이라이트되고 표시한다", () => {
    render(<NotificationList notifications={mockNotifications} />);

    const unreadNotification = screen.getByText("새로운 신청이 도착했습니다.").closest("li");
    expect(unreadNotification).toHaveClass("bg-muted/30");

    const readNotification = screen.getByText("신청이 수락되었습니다.").closest("li");
    expect(readNotification).not.toHaveClass("bg-muted/30");
  });

  it("미읽음 알림에 폰트 굵게 스타일을 적용한다", () => {
    render(<NotificationList notifications={mockNotifications} />);

    const unreadMessage = screen.getByText("새로운 신청이 도착했습니다.");
    expect(unreadMessage).toHaveClass("font-semibold");

    const readMessage = screen.getByText("신청이 수락되었습니다.");
    expect(readMessage).not.toHaveClass("font-semibold");
  });

  it("미읽음 알림에 읽음 표시 점을 렌더링한다", () => {
    render(<NotificationList notifications={mockNotifications} />);

    const unreadNotification = screen.getByText("새로운 신청이 도착했습니다.").closest("li");
    const unreadDot = unreadNotification?.querySelector('div[class*="rounded-full bg-primary"]');
    expect(unreadDot).toBeTruthy();

    const readNotification = screen.getByText("신청이 수락되었습니다.").closest("li");
    const readDot = readNotification?.querySelector('div[class*="rounded-full bg-primary"]');
    expect(readDot).toBeNull();
  });

  it("전체 읽음 버튼 클릭 시 read-all API를 호출한다", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, updated: 2 }),
    });

    render(<NotificationList notifications={mockNotifications} />);

    const readAllButton = screen.getByRole("button", { name: "전체 읽음" });
    fireEvent.click(readAllButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/notifications/read-all",
        expect.objectContaining({
          method: "PATCH",
        }),
      );
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("알림 항목 클릭 시 read API를 호출하고 linkUrl로 이동한다", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, readAt: "2026-01-15T12:00:00Z" }),
    });

    render(<NotificationList notifications={mockNotifications} />);

    const notification = screen.getByText("새로운 신청이 도착했습니다.").closest("li");
    fireEvent.click(notification!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/notifications/notif1/read",
        expect.objectContaining({
          method: "PATCH",
        }),
      );
      expect(mockPush).toHaveBeenCalledWith("/dashboard/creator/programs/prog1/applications");
    });
  });
});
