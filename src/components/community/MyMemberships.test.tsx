// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MyMemberships } from "@/components/community/MyMemberships";

vi.mock("@/components/community/CancelMembershipButton", () => ({
  CancelMembershipButton: ({ membershipId }: { membershipId: string }) => (
    <button type="button">취소 {membershipId}</button>
  ),
}));

describe("MyMemberships", () => {
  it("활성 멤버십에는 취소 버튼을 표시한다", () => {
    render(
      <MyMemberships
        memberships={[
          {
            id: "mem-1",
            status: "ACTIVE",
            startedAt: "2026-06-01",
            cancelledAt: null,
            plan: {
              id: "plan-1",
              title: "서포터",
              priceKrw: 9900,
              creatorProfile: { id: "cp-1", studioName: "작가 스튜디오" },
            },
          },
        ]}
      />,
    );

    expect(screen.getByText("작가 스튜디오")).toBeTruthy();
    expect(screen.getByText("상태: 활성")).toBeTruthy();
    expect(screen.getByRole("button", { name: "취소 mem-1" })).toBeTruthy();
  });

  it("취소된 멤버십에는 취소 버튼을 표시하지 않는다", () => {
    render(
      <MyMemberships
        memberships={[
          {
            id: "mem-2",
            status: "CANCELLED",
            startedAt: "2026-06-01",
            cancelledAt: "2026-06-24",
            plan: {
              id: "plan-2",
              title: "서포터",
              priceKrw: 9900,
              creatorProfile: { id: "cp-1", studioName: "작가 스튜디오" },
            },
          },
        ]}
      />,
    );

    expect(screen.getByText(/상태: 취소됨/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /취소 mem-2/ })).toBeNull();
  });
});
