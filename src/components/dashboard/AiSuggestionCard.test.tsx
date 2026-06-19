// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AiSuggestionCard } from "@/components/dashboard/AiSuggestionCard";

const OPENAI = {
  suggestedPrice: 42000,
  benefits: ["피드백"],
  programStructure: [{ week: 1, title: "기초", description: "선 연습" }],
  reason: "초심자 맞춤",
  source: "openai" as const,
};

const MOCK = { ...OPENAI, source: "mock" as const };

describe("AiSuggestionCard (SPEC-010)", () => {
  it("renders price, benefits, structure, reason", () => {
    render(
      <AiSuggestionCard suggestion={OPENAI} onApply={() => {}} onClose={() => {}} />,
    );
    expect(screen.getByText("42,000원")).toBeInTheDocument();
    expect(screen.getByText("피드백")).toBeInTheDocument();
    expect(screen.getByText(/초심자 맞춤/)).toBeInTheDocument();
  });

  it("shows fallback notice when source=mock (AC-004)", () => {
    render(<AiSuggestionCard suggestion={MOCK} onApply={() => {}} onClose={() => {}} />);
    expect(
      screen.getByText("AI 일시적 오류로 기본 추천을 표시합니다"),
    ).toBeInTheDocument();
  });

  it("calls onApply with suggestion when '추천 반영' clicked (AC-002)", () => {
    const onApply = vi.fn();
    render(<AiSuggestionCard suggestion={OPENAI} onApply={onApply} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "추천 반영" }));
    expect(onApply).toHaveBeenCalledWith(OPENAI);
  });

  it("calls onClose when '닫기' clicked", () => {
    const onClose = vi.fn();
    render(<AiSuggestionCard suggestion={OPENAI} onApply={() => {}} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(onClose).toHaveBeenCalled();
  });
});
