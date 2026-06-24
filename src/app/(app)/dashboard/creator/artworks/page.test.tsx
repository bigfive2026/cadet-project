// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockRequireRole = vi.fn();
const mockListCreatorArtworks = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));

vi.mock("@/lib/queries/artworks", () => ({
  listCreatorArtworks: (...args: unknown[]) => mockListCreatorArtworks(...args),
}));

vi.mock("@/components/artworks/CreatorAssetForms", () => ({
  ArtworkForm: () => <div>판매 작품 등록 폼</div>,
}));

vi.mock("@/components/artworks/CreatorAssetManager", () => ({
  ArtworkManagerCard: ({ artwork }: { artwork: { title: string } }) => (
    <article>{artwork.title}</article>
  ),
}));

import CreatorArtworksPage from "@/app/(app)/dashboard/creator/artworks/page";

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue({
    role: "CREATOR",
    creatorProfile: { id: "cp-1" },
  });
  mockListCreatorArtworks.mockResolvedValue([]);
});

describe("/dashboard/creator/artworks", () => {
  it("renders only sales artwork management", async () => {
    const ui = await CreatorArtworksPage();
    render(ui);

    expect(mockListCreatorArtworks).toHaveBeenCalledWith("cp-1");
    expect(screen.getByRole("heading", { name: "판매 작품 관리" })).toBeTruthy();
    expect(screen.getByText("판매 작품 등록 폼")).toBeTruthy();
    expect(screen.queryByText("기존 작업물")).toBeNull();
    expect(screen.queryByText("작업물 등록")).toBeNull();
  });

  it("renders registered artwork cards", async () => {
    mockListCreatorArtworks.mockResolvedValue([
      {
        id: "art-1",
        title: "청화 백자",
        description: null,
        imageUrl: null,
        priceKrw: 120000,
        stock: 1,
        status: "PUBLISHED",
        _count: { orders: 2 },
      },
    ]);

    const ui = await CreatorArtworksPage();
    render(ui);

    expect(screen.getByText("청화 백자")).toBeTruthy();
  });
});
