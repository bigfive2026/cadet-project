// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreatorCard } from "@/components/creators/CreatorCard";

describe("CreatorCard (FR-002, NFR-004)", () => {
  it("renders studioName and links to /creators/{id}", () => {
    render(
      <CreatorCard
        creator={{ id: "p-1", studioName: "신진작가 스튜디오", bio: "소개글" }}
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/creators/p-1");
    expect(screen.getByText("신진작가 스튜디오")).toBeTruthy();
  });

  it("renders bio when provided", () => {
    render(
      <CreatorCard
        creator={{ id: "p-1", studioName: "S", bio: "작가 소개 텍스트" }}
      />,
    );
    expect(screen.getByText("작가 소개 텍스트")).toBeTruthy();
  });

  it("does not crash when bio/profileImageUrl/category are null (NFR-004)", () => {
    expect(() =>
      render(
        <CreatorCard
          creator={{ id: "p-2", studioName: "미니멀", bio: null }}
        />,
      ),
    ).not.toThrow();
    expect(screen.getByText("미니멀")).toBeTruthy();
  });

  it("renders category badge when present", () => {
    render(
      <CreatorCard
        creator={{
          id: "p-3",
          studioName: "S",
          bio: null,
          category: "회화",
        }}
      />,
    );
    expect(screen.getByText("회화")).toBeTruthy();
  });

  it("renders profile image when profileImageUrl is present", () => {
    render(
      <CreatorCard
        creator={{
          id: "p-4",
          studioName: "이미지 작가",
          bio: null,
          profileImageUrl: "https://example.com/x.jpg",
        }}
      />,
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/x.jpg");
    expect(img).toHaveAttribute("alt", "이미지 작가");
  });
});
