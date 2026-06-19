import { describe, expect, it } from "vitest";
import { isParticipantPaid } from "@/components/community/ParticipantList";

describe("isParticipantPaid (AC-007)", () => {
  it("PAID 결제가 있으면 true를 반환한다", () => {
    expect(
      isParticipantPaid({
        id: "a-1",
        user: { id: "u-1", name: "팬" },
        contract: { payments: [{ status: "PAID" }] },
      }),
    ).toBe(true);
  });

  it("RELEASED 결제가 있으면 true를 반환한다", () => {
    expect(
      isParticipantPaid({
        id: "a-1",
        user: { id: "u-1", name: "팬" },
        contract: { payments: [{ status: "RELEASED" }] },
      }),
    ).toBe(true);
  });

  it("PENDING 결제만 있으면 false를 반환한다 (결제 대기)", () => {
    expect(
      isParticipantPaid({
        id: "a-1",
        user: { id: "u-1", name: "팬" },
        contract: { payments: [{ status: "PENDING" }] },
      }),
    ).toBe(false);
  });

  it("contract가 없으면 false를 반환한다", () => {
    expect(
      isParticipantPaid({
        id: "a-1",
        user: { id: "u-1", name: "팬" },
        contract: null,
      }),
    ).toBe(false);
  });

  it("결제 내역이 비어 있으면 false를 반환한다", () => {
    expect(
      isParticipantPaid({
        id: "a-1",
        user: { id: "u-1", name: "팬" },
        contract: { payments: [] },
      }),
    ).toBe(false);
  });
});
