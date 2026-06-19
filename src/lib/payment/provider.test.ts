import { describe, expect, it } from "vitest";
import {
  MockPaymentProvider,
  mockPaymentProvider,
  type PaymentProvider,
} from "./provider";

describe("lib/payment/provider (SPEC-006 FR-006, NFR-002, NFR-005)", () => {
  it("MockPaymentProvider는 PaymentProvider 인터페이스를 만족한다", () => {
    const provider: PaymentProvider = new MockPaymentProvider();
    expect(provider.name).toBe("mock");
    expect(typeof provider.charge).toBe("function");
  });

  it("charge는 외부 의존성 없이 항상 성공을 반환한다 (NFR-002, AC-008)", async () => {
    const result = await mockPaymentProvider.charge({
      contractId: "c1",
      amount: 35000,
    });
    expect(result.success).toBe(true);
    expect(result.provider).toBe("mock");
    expect(result.amount).toBe(35000);
    expect(result.providerTxId).toContain("c1");
  });

  it("동일 입력이라도 providerTxId는 고유하다", async () => {
    const a = await mockPaymentProvider.charge({ contractId: "c1", amount: 1 });
    const b = await mockPaymentProvider.charge({ contractId: "c1", amount: 1 });
    expect(a.providerTxId).not.toBe(b.providerTxId);
  });
});
