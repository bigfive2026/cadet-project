// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { ApplicationList } from "@/components/applications/ApplicationList";

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe("ApplicationList (FR-002, AC-003, AC-004)", () => {
  const mockApplications = [
    {
      id: "app1",
      userId: "user1",
      status: "PENDING",
      message: "참여하고 싶습니다",
      createdAt: "2026-01-15T10:00:00Z",
      user: { id: "user1", name: "김철수" },
    },
    {
      id: "app2",
      userId: "user2",
      status: "ACCEPTED",
      message: null,
      createdAt: "2026-01-14T10:00:00Z",
      user: { id: "user2", name: "이영희" },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("빈 목록일 경우 안내 메시지를 렌더링한다", () => {
    render(<ApplicationList programId="prog1" applications={[]} />);
    expect(screen.getByText("아직 신청이 없습니다.")).toBeTruthy();
  });

  it("신청 목록을 렌더링한다", () => {
    render(<ApplicationList programId="prog1" applications={mockApplications} />);

    expect(screen.getByText("김철수")).toBeTruthy();
    expect(screen.getByText("이영희")).toBeTruthy();
    // 상태 배지 확인
    expect(screen.getByText("대기 중")).toBeTruthy();
    // ACCEPTED 상태 배지도 표시되어야 함
    const acceptedBadges = screen.getAllByText("수락");
    expect(acceptedBadges.length).toBeGreaterThan(0);
  });

  it("PENDING 상태의 신청에 수락/거절 버튼을 렌더링한다", () => {
    render(<ApplicationList programId="prog1" applications={mockApplications} />);

    // 철수의 신청(PENDING)은 버튼이 있어야 함
    expect(screen.getByText("김철수")).toBeTruthy();
    // 전체 버튼 수 확인 (PENDING 신청에는 수락/거절 2개)
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("ACCEPTED 상태의 신청에는 버튼을 렌더링하지 않는다", () => {
    render(<ApplicationList programId="prog1" applications={mockApplications} />);

    // 이영희의 신청은 ACCEPTED 상태이므로 그 주변에 버튼이 없어야 함
    const 영희행 = screen.getByText("이영희").closest("div")?.closest("div");
    const buttons = 영희행?.querySelectorAll("button");
    expect(buttons?.length).toBe(0);
  });

  it("수락 버튼 클릭 시 fetch를 호출한다", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ application: {}, autoRejectedCount: 0 }),
    });

    render(<ApplicationList programId="prog1" applications={mockApplications} />);

    // 첫 번째 버튼 클릭 (수락)
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/applications/app1",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining('"action":"accept"'),
        }),
      );
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("자동 거절 체크박스를 선택하고 수락 시 autoRejectOthers:true를 전송한다", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ application: {}, autoRejectedCount: 2 }),
    });

    render(<ApplicationList programId="prog1" applications={mockApplications} />);

    const checkbox = screen.getByLabelText(/수락 시 다른 대기 신청 자동 거절/);
    fireEvent.click(checkbox);

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/applications/app1",
        expect.objectContaining({
          body: expect.stringContaining('"autoRejectOthers":true'),
        }),
      );
    });
  });

  it("거절 버튼 클릭 시 reject action을 전송한다", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ application: {}, autoRejectedCount: 0 }),
    });

    render(<ApplicationList programId="prog1" applications={mockApplications} />);

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // 두 번째 버튼이 거절

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/applications/app1",
        expect.objectContaining({
          body: expect.stringContaining('"action":"reject"'),
        }),
      );
    });
  });
});
