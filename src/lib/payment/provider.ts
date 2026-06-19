/**
 * 결제 Provider 추상화 (SPEC-006 FR-006, FR-009, NFR-002, NFR-005).
 *
 * `PaymentProvider` 인터페이스는 Mock 외에 향후 PortOne/Toss sandbox 구현을
 * 허용하는 형태다. 본 SPEC에서는 외부 의존성 없이 항상 성공하는
 * `MockPaymentProvider`만 제공한다 (PRD §5.2 "실제 결제 금지").
 */

export interface ChargeInput {
  /** 계약 결제(SPEC-006) 컨텍스트. 단건 포스트 결제 시 생략. */
  contractId?: string;
  /** 단건 PAID 포스트 결제(SPEC-009 NFR-006) 컨텍스트. 계약 결제 시 생략. */
  postId?: string;
  amount: number;
}

export interface PaymentResult {
  success: boolean;
  provider: string;
  /** Mock 거래 식별자 — 실제 PG txId 자리표시자. */
  providerTxId: string;
  amount: number;
}

export interface PaymentProvider {
  readonly name: string;
  charge(input: ChargeInput): Promise<PaymentResult>;
}

/**
 * Mock 결제 Provider (FR-006, NFR-002).
 *
 * 외부 네트워크/파일 IO에 의존하지 않고 항상 성공을 반환한다 (데모 안정성).
 * 환경 변수 없이 동작한다 (NFR-004).
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  private sequence = 0;

  async charge(input: ChargeInput): Promise<PaymentResult> {
    this.sequence += 1;
    return {
      success: true,
      provider: this.name,
      providerTxId: `mock_${input.contractId ?? input.postId ?? "txn"}_${Date.now()}_${this.sequence}`,
      amount: input.amount,
    };
  }
}

/** 기본 결제 Provider 인스턴스 (애플리케이션 전역에서 사용). */
export const mockPaymentProvider: PaymentProvider = new MockPaymentProvider();
