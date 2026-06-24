// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockRequireRole = vi.fn();
const mockListCreatorWorks = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock("@/lib/queries/artworks", () => ({
  listCreatorWorks: (...args: unknown[]) => mockListCreatorWorks(...args),
}));

vi.mock("@/components/artworks/CreatorAssetForms", () => ({
  CreatorWorkForm: () => <div>작업물 등록 폼</div>,
}));

vi.mock("@/components/artworks/CreatorAssetManager", () => ({
  CreatorWorkManagerCard: ({ work }: { work: { title: string } }) => (
    <article>{work.title}</article>
  ),
}));

import CreatorWorksPage from "@/app/(app)/dashboard/creator/works/page";

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue({
    role: "CREATOR",
    creatorProfile: { id: "cp-1" },
  });
  mockListCreatorWorks.mockResolvedValue([]);
});

describe("/dashboard/creator/works", () => {
  it("renders only creator work management", async () => {
    const ui = await CreatorWorksPage();
    render(ui);

    expect(mockListCreatorWorks).toHaveBeenCalledWith("cp-1");
    expect(screen.getByRole("heading", { name: "작업 관리" })).toBeTruthy();
    expect(screen.getByText("작업물 등록 폼")).toBeTruthy();
    expect(screen.queryByText("판매 작품")).toBeNull();
    expect(screen.queryByText("작품 등록")).toBeNull();
  });

  it("renders registered work cards with period labels", async () => {
    mockListCreatorWorks.mockResolvedValue([
      {
        id: "work-1",
        title: "도자기 개인전",
        kind: "전시",
        description: null,
        imageUrl: null,
        externalUrl: null,
        startedAt: new Date("2026-06-01T00:00:00.000Z"),
        endedAt: null,
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
        updatedAt: new Date("2026-06-01T00:00:00.000Z"),
      },
    ]);

    const ui = await CreatorWorksPage();
    render(ui);

    expect(screen.getByText("도자기 개인전")).toBeTruthy();
  });
});
