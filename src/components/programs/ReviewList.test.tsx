// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewList } from "@/components/programs/ReviewList";

describe("ReviewList (FR-011, FR-012, AC-010, AC-012)", () => {
  it("리뷰가 있으면 평균 평점과 목록을 표시한다 (AC-010)", () => {
    render(
      <ReviewList
        avgRating={4.5}
        reviews={[
          {
            id: "r1",
            rating: 4,
            comment: "좋아요",
            tags: ["구성이 알차요"],
            createdAt: new Date(),
            user: { id: "u1", name: "팬1" },
          },
          {
            id: "r2",
            rating: 5,
            comment: null,
            tags: [],
            createdAt: new Date(),
            user: { id: "u2", name: "팬2" },
          },
        ]}
      />,
    );
    expect(screen.getByText(/4\.5/)).toBeTruthy();
    expect(screen.getByText("팬1")).toBeTruthy();
    expect(screen.getByText("팬2")).toBeTruthy();
  });

  it("리뷰가 없으면 안내 문구를 표시한다 (AC-012)", () => {
    render(<ReviewList avgRating={null} reviews={[]} />);
    expect(screen.getByText("아직 리뷰가 없습니다.")).toBeTruthy();
  });
});
