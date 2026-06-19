// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AiSuggestPanel } from "@/components/dashboard/AiSuggestPanel";

const VALID = {
  suggestedPrice: 35000,
  benefits: ["혜택1"],
  programStructure: [{ week: 1, title: "기초", description: "선" }],
  reason: "사유",
  source: "mock" as const,
};

beforeEach(() => {
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function fillForm() {
  fireEvent.change(screen.getByPlaceholderText("예: 4주 드로잉 챌린지"), {
    target: { value: "4주 드로잉 챌린지" },
  });
}

describe("AiSuggestPanel (SPEC-010)", () => {
  it("disables button while description empty", () => {
    render(<AiSuggestPanel onApply={() => {}} />);
    expect(screen.getByRole("button", { name: "AI 추천 받기" })).toBeDisabled();
  });

  it("shows loading state and disables button during request (AC-007)", async () => {
    let resolveFn!: (r: Response) => void;
    vi.mocked(global.fetch).mockReturnValue(
      new Promise<Response>((res) => {
        resolveFn = res;
      }),
    );

    render(<AiSuggestPanel onApply={() => {}} />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "AI 추천 받기" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "AI 추천 생성 중..." })).toBeDisabled();
    });

    resolveFn({ ok: true, json: async () => VALID } as Response);
    await waitFor(() => {
      expect(screen.getByText("35,000원")).toBeInTheDocument();
    });
  });

  it("renders result card after successful response and applies on click", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => VALID,
    } as Response);

    const onApply = vi.fn();
    render(<AiSuggestPanel onApply={onApply} />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "AI 추천 받기" }));

    await waitFor(() => {
      expect(screen.getByText("35,000원")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "추천 반영" }));
    expect(onApply).toHaveBeenCalled();
  });
});
