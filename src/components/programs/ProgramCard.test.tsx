// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgramCard } from "@/components/programs/ProgramCard";

describe("ProgramCard (FR-003, FR-005, AC-002, AC-006)", () => {
  const base = {
    id: "prog-1",
    title: "4주 드로잉 챌린지",
    priceKrw: 35000,
    status: "RECRUITING" as const,
    creatorProfile: { id: "p-A", studioName: "드로잉 스튜디오" },
  };

  it("제목·가격·크리에이터·상세 링크를 렌더한다 (AC-002)", () => {
    render(<ProgramCard program={base} />);
    const link = screen.getByRole("link", { name: "4주 드로잉 챌린지" });
    expect(link).toHaveAttribute("href", "/programs/prog-1");
    expect(screen.getByText("₩35,000")).toBeTruthy();
    expect(screen.getByText("드로잉 스튜디오")).toBeTruthy();
  });

  it("RECRUITING 상태는 '모집 중' 배지를 표시한다", () => {
    render(<ProgramCard program={base} />);
    expect(screen.getByText("모집 중")).toBeTruthy();
  });

  it("RECRUITING + 과거 마감일이면 '모집 마감'으로 표시한다 (AC-006)", () => {
    render(<ProgramCard program={{ ...base, recruitDeadline: "2000-01-01" }} />);
    expect(screen.getByText("모집 마감")).toBeTruthy();
  });

  it("선택 필드가 없어도 렌더된다", () => {
    expect(() =>
      render(<ProgramCard program={{ id: "p", title: "t", priceKrw: 0, status: "RECRUITING" }} />),
    ).not.toThrow();
  });
});
