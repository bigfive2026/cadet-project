// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NewProgramClient } from "@/components/dashboard/NewProgramClient";

const VALID = {
  suggestedPrice: 47000,
  benefits: ["혜택A"],
  programStructure: [{ week: 1, title: "기초", description: "선" }],
  reason: "사유",
  source: "mock" as const,
};

const action = vi.fn();

describe("NewProgramClient (SPEC-010 AC-002)", () => {
  it("injects suggested price and description block on apply", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => VALID,
    } as Response);

    render(<NewProgramClient action={action} />);

    // AI 추천 요청
    fireEvent.change(screen.getByLabelText("프로그램 설명"), {
      target: { value: "4주 드로잉 챌린지" },
    });
    fireEvent.click(screen.getByRole("button", { name: "AI 추천 받기" }));

    await waitFor(() => {
      expect(screen.getByText("47,000원")).toBeInTheDocument();
    });

    // 추천 반영 → 폼에 주입
    fireEvent.click(screen.getByRole("button", { name: "추천 반영" }));

    const priceInput = document.getElementById("priceKrw") as HTMLInputElement;
    expect(priceInput.value).toBe("47000");

    const descTextarea = document.getElementById("description") as HTMLTextAreaElement;
    expect(descTextarea.value).toContain("혜택A");
    expect(descTextarea.value).toContain("주차 구성");
  });
});
