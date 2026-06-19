import { describe, expect, it } from "vitest";
import {
  effectiveStatus,
  isPubliclyVisible,
  isTransitionAllowed,
  PUBLIC_PROGRAM_STATUSES,
} from "@/lib/program-status";

describe("isTransitionAllowed (FR-007, AC-009)", () => {
  it("같은 상태로의 no-op은 허용한다", () => {
    expect(isTransitionAllowed("RECRUITING", "RECRUITING")).toBe(true);
  });

  it("RECRUITING → CLOSED는 허용한다 (AC-005)", () => {
    expect(isTransitionAllowed("RECRUITING", "CLOSED")).toBe(true);
  });

  it("DRAFT → RECRUITING은 허용한다", () => {
    expect(isTransitionAllowed("DRAFT", "RECRUITING")).toBe(true);
  });

  it("COMPLETED → RECRUITING은 거부한다 (AC-009)", () => {
    expect(isTransitionAllowed("COMPLETED", "RECRUITING")).toBe(false);
  });

  it("RECRUITING → IN_PROGRESS는 거부한다 (SPEC-006이 트리거)", () => {
    expect(isTransitionAllowed("RECRUITING", "IN_PROGRESS")).toBe(false);
  });
});

describe("effectiveStatus (FR-005, AC-006)", () => {
  const now = new Date("2026-06-18T00:00:00Z");

  it("RECRUITING + 마감일 과거 → CLOSED로 평가한다", () => {
    expect(
      effectiveStatus({ status: "RECRUITING", recruitDeadline: new Date("2026-06-01") }, now),
    ).toBe("CLOSED");
  });

  it("RECRUITING + 마감일 미래 → RECRUITING 유지", () => {
    expect(
      effectiveStatus({ status: "RECRUITING", recruitDeadline: new Date("2026-07-01") }, now),
    ).toBe("RECRUITING");
  });

  it("마감일 없으면 그대로 RECRUITING", () => {
    expect(effectiveStatus({ status: "RECRUITING", recruitDeadline: null }, now)).toBe("RECRUITING");
  });

  it("RECRUITING이 아닌 상태는 마감일과 무관하게 그대로 둔다", () => {
    expect(
      effectiveStatus({ status: "COMPLETED", recruitDeadline: new Date("2026-06-01") }, now),
    ).toBe("COMPLETED");
  });
});

describe("isPubliclyVisible (FR-003, FR-008, FR-009)", () => {
  it("RECRUITING이고 삭제되지 않았으면 공개", () => {
    expect(isPubliclyVisible({ status: "RECRUITING", deletedAt: null })).toBe(true);
  });

  it("DRAFT는 비공개 (FR-009)", () => {
    expect(isPubliclyVisible({ status: "DRAFT", deletedAt: null })).toBe(false);
  });

  it("CANCELLED는 비공개", () => {
    expect(isPubliclyVisible({ status: "CANCELLED", deletedAt: null })).toBe(false);
  });

  it("soft-delete되면 공개 상태여도 비공개 (FR-008)", () => {
    expect(isPubliclyVisible({ status: "RECRUITING", deletedAt: new Date() })).toBe(false);
  });

  it("PUBLIC_PROGRAM_STATUSES는 DRAFT/CANCELLED를 포함하지 않는다", () => {
    expect(PUBLIC_PROGRAM_STATUSES).not.toContain("DRAFT");
    expect(PUBLIC_PROGRAM_STATUSES).not.toContain("CANCELLED");
  });
});
