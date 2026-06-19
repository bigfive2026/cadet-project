// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OpenContractButton } from "@/components/contracts/OpenContractButton";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

beforeEach(() => {
  mockPush.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("OpenContractButton (SPEC-006 FR-001, AC-001)", () => {
  it("기본 라벨을 렌더링한다", () => {
    render(<OpenContractButton applicationId="app-1" />);
    expect(screen.getByRole("button", { name: "계약 진행" })).toBeTruthy();
  });

  it("클릭 시 계약을 생성/조회하고 /contracts/[id]로 이동한다", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "contract-1" }),
    });
    render(<OpenContractButton applicationId="app-1" />);
    fireEvent.click(screen.getByRole("button", { name: "계약 진행" }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/applications/app-1/contract",
        expect.objectContaining({ method: "POST" }),
      );
      expect(mockPush).toHaveBeenCalledWith("/contracts/contract-1");
    });
  });

  it("실패 시 에러 메시지를 표시하고 이동하지 않는다", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    render(<OpenContractButton applicationId="app-1" />);
    fireEvent.click(screen.getByRole("button", { name: "계약 진행" }));
    await waitFor(() => {
      expect(screen.getByText("계약을 열 수 없습니다.")).toBeTruthy();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
