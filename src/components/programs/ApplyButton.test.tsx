// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { ApplyButton } from "@/components/programs/ApplyButton";

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe("ApplyButton (FR-001, AC-001)", () => {

  it("모집 중이 아닌 경우 null을 렌더링한다", () => {
    const { container } = render(
      <ApplyButton programId="prog1" applied={false} recruiting={false} owner={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("본인 프로그램인 경우 null을 렌더링한다", () => {
    const { container } = render(
      <ApplyButton programId="prog1" applied={false} recruiting={true} owner={true} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("이미 신청한 경우 disabled '신청 완료' 버튼을 렌더링한다", () => {
    render(<ApplyButton programId="prog1" applied={true} recruiting={true} owner={false} />);
    const button = screen.getByRole("button", { name: "신청 완료" });
    expect(button).toBeDisabled();
  });

  it("신청 가능한 경우 폼을 렌더링한다", () => {
    render(<ApplyButton programId="prog1" applied={false} recruiting={true} owner={false} />);
    expect(screen.getByLabelText("메시지 (선택)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "참여 신청" })).toBeTruthy();
  });

  it("폼 제출 성공 시 성공 메시지를 표시하고 router.refresh를 호출한다", async () => {
    vi.clearAllMocks();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "app1" }),
    });

    render(<ApplyButton programId="prog1" applied={false} recruiting={true} owner={false} />);

    const button = screen.getByRole("button", { name: "참여 신청" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("신청이 완료되었습니다.")).toBeTruthy();
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("409 응답 시 '이미 신청했습니다' 에러를 표시한다", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "Already applied" }),
    });

    render(<ApplyButton programId="prog1" applied={false} recruiting={true} owner={false} />);

    const button = screen.getByRole("button", { name: "참여 신청" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/이미 신청했습니다/)).toBeTruthy();
    });
  });

  it("400 응답 시 에러를 표시한다", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Cannot apply to own program" }),
    });

    render(<ApplyButton programId="prog1" applied={false} recruiting={true} owner={false} />);

    const button = screen.getByRole("button", { name: "참여 신청" });
    fireEvent.click(button);

    await waitFor(() => {
      // API에서 반환하는 에러 메시지가 있으면 표시, 없으면 기본 메시지
      expect(screen.queryByText(/Cannot apply to own program/)).toBeTruthy();
    });
  });

  it("401 응답 시 로그인 필요 에러를 표시한다", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    render(<ApplyButton programId="prog1" applied={false} recruiting={true} owner={false} />);

    const button = screen.getByRole("button", { name: "참여 신청" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("로그인이 필요합니다.")).toBeTruthy();
    });
  });
});
