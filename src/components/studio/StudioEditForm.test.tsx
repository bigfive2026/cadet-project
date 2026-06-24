// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

import { StudioEditForm } from "@/components/studio/StudioEditForm";

const originalFetch = global.fetch;

beforeEach(() => {
  mockRedirect.mockReset();
});
afterEach(() => {
  vi.clearAllMocks();
  global.fetch = originalFetch;
});

describe("StudioEditForm (AC-005)", () => {
  const profile = {
    id: "p-1",
    studioName: "신진작가 스튜디오",
    bio: "작가 소개",
    category: "회화",
    coverImageUrl: null,
    profileImageUrl: null,
    instagramUrl: "https://instagram.com/foo",
    websiteUrl: "https://example.com",
  };

  it("prefills inputs from profile", () => {
    render(<StudioEditForm profile={profile} />);
    expect((screen.getByLabelText(/스튜디오 이름/) as HTMLInputElement).value).toBe(
      "신진작가 스튜디오",
    );
    expect((screen.getByLabelText(/Instagram/) as HTMLInputElement).value).toBe(
      "https://instagram.com/foo",
    );
  });

  it("submits PATCH /api/studio with form values and redirects on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<StudioEditForm profile={profile} />);
    fireEvent.change(screen.getByLabelText(/스튜디오 이름/), {
      target: { value: "새 이름" },
    });
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/studio",
        expect.objectContaining({
          method: "PATCH",
          body: expect.any(String),
        }),
      );
    });
    const call = fetchMock.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.creatorProfileId).toBe("p-1");
    expect(body.studioName).toBe("새 이름");

    await waitFor(() => {
      expect(mockRedirect).toHaveBeenCalledWith("/creators/p-1");
    });
  });

  it("shows error message on non-200 response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: "Forbidden" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<StudioEditForm profile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));

    await waitFor(
      () => {
        expect(screen.getByText(/403|저장에 실패|Forbidden/i)).toBeTruthy();
      },
      { timeout: 2000 },
    );
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("shows fallback error when response body cannot be parsed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("parse error");
      },
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<StudioEditForm profile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));

    await waitFor(() => {
      expect(screen.getByText(/500/)).toBeTruthy();
    });
  });

  it("shows generic error when fetch throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<StudioEditForm profile={profile} />);
    fireEvent.click(screen.getByRole("button", { name: /저장/ }));

    await waitFor(() => {
      expect(screen.getByText(/알 수 없는 오류/)).toBeTruthy();
    });
  });

  it("updates field values on user input", () => {
    render(<StudioEditForm profile={profile} />);
    const bio = screen.getByLabelText(/소개글/) as HTMLTextAreaElement;
    fireEvent.change(bio, { target: { value: "새 소개" } });
    expect(bio.value).toBe("새 소개");
    // 모든 필드 onChange 핸들러 실행 (커버리지)
    const fields: Array<[string, string]> = [
      ["스튜디오 이름", "x"],
      ["카테고리", "y"],
      ["프로필 이미지 URL", "z"],
      ["커버 이미지 URL", "w"],
      ["Instagram URL", "i"],
      ["Website URL", "h"],
    ];
    for (const [label, val] of fields) {
      const el = screen.getByLabelText(label) as HTMLInputElement;
      fireEvent.change(el, { target: { value: val } });
      expect(el.value).toBe(val);
    }
  });
});
