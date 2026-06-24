// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  MyApplicationItem,
  type MyApplicationItemData,
} from "@/components/applications/MyApplicationItem";

function renderItem(overrides: Partial<MyApplicationItemData> = {}) {
  const application: MyApplicationItemData = {
    id: "app1",
    status: "PENDING",
    createdAt: "2026-06-18T00:00:00Z",
    updatedAt: "2026-06-18T00:00:00Z",
    deliveryRequestedAt: null,
    completionApprovedAt: null,
    program: { id: "prog1", title: "수채화 클래스", priceKrw: 50000 },
    ...overrides,
  };
  return render(
    <ul>
      <MyApplicationItem application={application} />
    </ul>,
  );
}

describe("MyApplicationItem", () => {
  it("프로그램 제목과 가격을 표시한다", () => {
    renderItem();
    expect(screen.getByText("수채화 클래스")).toBeTruthy();
    expect(screen.getByText("50,000원")).toBeTruthy();
  });

  it("진행 스텝퍼 라벨을 표시한다", () => {
    renderItem();
    expect(screen.getByText("신청")).toBeTruthy();
    expect(screen.getByText("결제")).toBeTruthy();
    expect(screen.getByText("참여 확정")).toBeTruthy();
    expect(screen.getByText("완료")).toBeTruthy();
  });

  it("진행한 단계의 날짜를 함께 표시한다", () => {
    renderItem({
      status: "ACCEPTED",
      createdAt: "2026-06-18T00:00:00Z",
      updatedAt: "2026-06-19T00:00:00Z",
      deliveryRequestedAt: "2026-06-20T00:00:00Z",
      completionApprovedAt: "2026-06-21T00:00:00Z",
      payment: {
        status: "PAID",
        createdAt: "2026-06-19T00:00:00Z",
        updatedAt: "2026-06-19T00:00:00Z",
      },
    });

    expect(screen.getByLabelText("신청 날짜 6. 18.")).toBeTruthy();
    expect(screen.getByLabelText("결제 날짜 6. 19.")).toBeTruthy();
    expect(screen.getByLabelText("진행 날짜 6. 20.")).toBeTruthy();
    expect(screen.getByLabelText("완료 날짜 6. 21.")).toBeTruthy();
  });

  it("신청됨(PENDING) 상태 배지를 표시한다", () => {
    renderItem({ status: "PENDING" });
    expect(screen.getByText("신청됨")).toBeTruthy();
  });

  it("확정 상태에서 결제 확인 액션을 제공한다", () => {
    renderItem({ status: "ACCEPTED" });
    expect(screen.getAllByText("참여 확정").length).toBeGreaterThan(0);
    const action = screen.getByRole("link", { name: "참여 상태 보기" });
    expect(action.getAttribute("href")).toBe("/programs/prog1/checkout");
  });

  it("완료 승인되면 완료 배지를 표시한다", () => {
    renderItem({
      status: "ACCEPTED",
      deliveryRequestedAt: "2026-06-20T00:00:00Z",
      completionApprovedAt: "2026-06-21T00:00:00Z",
    });
    expect(screen.getByText("완료됨")).toBeTruthy();
  });

  it("거절되면 거절 안내를 표시한다", () => {
    renderItem({ status: "REJECTED" });
    expect(screen.getByText("거절됨")).toBeTruthy();
    expect(screen.getByText(/받아들여지지 않았어요/)).toBeTruthy();
  });

  it("프로그램 상세로 연결되는 링크를 제공한다", () => {
    renderItem();
    const link = screen.getByRole("link", { name: /수채화 클래스/ });
    expect(link.getAttribute("href")).toBe("/programs/prog1");
  });
});
