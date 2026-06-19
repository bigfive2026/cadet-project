// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CompleteButton } from "@/components/programs/CompleteButton";

describe("CompleteButton (FR-001, AC-001)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ programStatus: "COMPLETED" }),
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("버튼을 렌더한다", () => {
    render(<CompleteButton programId="prog-1" />);
    expect(
      screen.getByRole("button", { name: "프로그램 완료 처리" }),
    ).toBeTruthy();
  });

  it("클릭 시 POST /api/programs/:id/complete 호출 후 완료 메시지 (AC-001)", async () => {
    render(<CompleteButton programId="prog-1" />);
    fireEvent.click(screen.getByRole("button", { name: "프로그램 완료 처리" }));

    await waitFor(() => {
      expect(
        screen.getByText("프로그램이 완료 처리되었습니다."),
      ).toBeTruthy();
    });
    const fetchMock = vi.mocked(fetch);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/programs/prog-1/complete");
    expect((init as RequestInit).method).toBe("POST");
  });

  it("실패 응답 시 에러 메시지를 표시한다", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Program is not IN_PROGRESS" }),
    } as Response);
    render(<CompleteButton programId="prog-1" />);
    fireEvent.click(screen.getByRole("button", { name: "프로그램 완료 처리" }));

    await waitFor(() => {
      expect(screen.getByText("Program is not IN_PROGRESS")).toBeTruthy();
    });
  });
});
