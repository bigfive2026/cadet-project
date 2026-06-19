// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReviewForm } from "@/components/programs/ReviewForm";

describe("ReviewForm (FR-005, FR-007, FR-010, AC-005, AC-007)", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "r1" }) }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("alreadyReviewed면 완료 메시지를 표시한다 (FR-010, 수정 불가)", () => {
    render(<ReviewForm programId="prog-1" alreadyReviewed={true} />);
    expect(screen.getByText("리뷰 작성이 완료되었습니다.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "리뷰 작성" })).toBeNull();
  });

  it("별점 선택 후 제출하면 POST /api/programs/:id/reviews 호출 (AC-005)", async () => {
    render(<ReviewForm programId="prog-1" alreadyReviewed={false} />);
    fireEvent.click(screen.getByText("★★")); // rating 2 라벨
    fireEvent.click(screen.getByRole("button", { name: "리뷰 작성" }));

    await waitFor(() => {
      const fetchMock = vi.mocked(fetch);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/programs/prog-1/reviews");
      expect((init as RequestInit).method).toBe("POST");
    });
  });
});
