// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgramDetail } from "@/components/programs/ProgramDetail";

// Mock next/navigation for ApplyButton
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

describe("ProgramDetail (FR-004, FR-005, AC-003, AC-006)", () => {
  const base = {
    id: "prog-1",
    title: "4주 드로잉 챌린지",
    priceKrw: 35000,
    maxParticipants: 20,
    status: "RECRUITING" as const,
    creatorProfile: { id: "p-A", studioName: "드로잉 스튜디오" },
    applied: false,
    owner: false,
  };

  it("title·priceKrw·maxParticipants·status 배지를 표시한다 (AC-003)", () => {
    render(<ProgramDetail program={base} />);
    expect(screen.getByText("4주 드로잉 챌린지")).toBeTruthy();
    expect(screen.getByText("₩35,000")).toBeTruthy();
    expect(screen.getByText("20명")).toBeTruthy();
    expect(screen.getByText("모집 중")).toBeTruthy();
  });

  it("RECRUITING이면 '참여 신청' CTA를 렌더한다 (SPEC-005에서 활성화)", () => {
    render(<ProgramDetail program={base} />);
    expect(screen.getByRole("button", { name: "참여 신청" })).toBeTruthy();
  });

  it("RECRUITING + 과거 마감일이면 '모집 마감' 상태로 표시한다 (AC-006)", () => {
    render(<ProgramDetail program={{ ...base, recruitDeadline: "2000-01-01" }} />);
    expect(screen.getByText("모집 마감")).toBeTruthy();
  });
});
