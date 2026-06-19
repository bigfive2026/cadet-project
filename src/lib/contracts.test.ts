import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock 호이스팅 대응: factory가 참조하는 mockPrisma를 vi.hoisted로 함께 끌어올린다.
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    contract: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    programApplication: {
      findUnique: vi.fn(),
    },
    payment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    settlement: {
      create: vi.fn(),
    },
    program: {
      update: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const mockCharge = vi.fn();
vi.mock("@/lib/payment/provider", () => ({
  mockPaymentProvider: { name: "mock", charge: (...a: unknown[]) => mockCharge(...a) },
}));

import {
  getOrCreateContract,
  signContract,
  startPayment,
  type ContractServiceContext,
} from "./contracts";

const FAN_ID = "fan-1";
const OTHER_FAN_ID = "fan-2";
const CREATOR_PROFILE_ID = "cprof-1";

const FAN_CTX: ContractServiceContext = {
  userId: FAN_ID,
  role: "FAN",
  creatorProfileId: null,
};

const CREATOR_CTX: ContractServiceContext = {
  userId: "creator-user-1",
  role: "CREATOR",
  creatorProfileId: CREATOR_PROFILE_ID,
};

// 공통 application+program+contract 픽스처
function applicationFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "app-1",
    userId: FAN_ID,
    status: "ACCEPTED",
    program: {
      id: "prog-1",
      title: "데모 프로그램",
      priceKrw: 35000,
      creatorProfileId: CREATOR_PROFILE_ID,
    },
    contract: null,
    ...overrides,
  };
}

function contractFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "contract-1",
    applicationId: "app-1",
    terms: { programTitle: "데모 프로그램", priceKrw: 35000, agreement: "약관" },
    agreedAmount: 35000,
    fanSignedAt: null,
    creatorSignedAt: null,
    application: {
      id: "app-1",
      userId: FAN_ID,
      program: {
        id: "prog-1",
        title: "데모 프로그램",
        priceKrw: 35000,
        creatorProfileId: CREATOR_PROFILE_ID,
      },
    },
    ...overrides,
  };
}

beforeEach(() => {
  Object.values(mockPrisma).forEach((m) => {
    if (typeof m === "function") return;
    Object.values(m as Record<string, ReturnType<typeof vi.fn>>).forEach((fn) => fn.mockReset());
  });
  mockCharge.mockReset();
  mockCharge.mockResolvedValue({ success: true, provider: "mock", providerTxId: "tx", amount: 35000 });
});
afterEach(() => vi.clearAllMocks());

describe("getOrCreateContract (FR-001, FR-002, FR-011)", () => {
  it("ACCEPTED 신청에 계약이 없으면 생성한다 (AC-001)", async () => {
    mockPrisma.programApplication.findUnique.mockResolvedValue(applicationFixture());
    mockPrisma.contract.create.mockResolvedValue(contractFixture());

    const result = await getOrCreateContract(FAN_CTX, "app-1");

    expect(result.ok).toBe(true);
    expect(mockPrisma.contract.create).toHaveBeenCalledOnce();
    const arg = mockPrisma.contract.create.mock.calls[0][0];
    expect(arg.data.applicationId).toBe("app-1");
    expect(arg.data.agreedAmount).toBe(35000);
    expect(arg.data.terms).toMatchObject({ programTitle: "데모 프로그램", priceKrw: 35000 });
  });

  it("이미 계약이 있으면 재생성하지 않고 기존 것을 반환한다 (FR-002, AC-001)", async () => {
    mockPrisma.programApplication.findUnique.mockResolvedValue(
      applicationFixture({ contract: contractFixture() }),
    );

    const result = await getOrCreateContract(FAN_CTX, "app-1");

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe("contract-1");
    expect(mockPrisma.contract.create).not.toHaveBeenCalled();
  });

  it("ACCEPTED가 아닌 신청은 400", async () => {
    mockPrisma.programApplication.findUnique.mockResolvedValue(
      applicationFixture({ status: "PENDING" }),
    );
    const result = await getOrCreateContract(FAN_CTX, "app-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("존재하지 않는 신청은 404", async () => {
    mockPrisma.programApplication.findUnique.mockResolvedValue(null);
    const result = await getOrCreateContract(FAN_CTX, "app-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("본인 신청도 크리에이터 소유자도 아니면 403 (FR-011)", async () => {
    mockPrisma.programApplication.findUnique.mockResolvedValue(applicationFixture());
    const result = await getOrCreateContract(
      { userId: OTHER_FAN_ID, role: "FAN", creatorProfileId: null },
      "app-1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("크리에이터 소유자는 계약을 조회할 수 있다 (FR-012)", async () => {
    mockPrisma.programApplication.findUnique.mockResolvedValue(
      applicationFixture({ contract: contractFixture() }),
    );
    const result = await getOrCreateContract(CREATOR_CTX, "app-1");
    expect(result.ok).toBe(true);
  });
});

describe("signContract (FR-003, FR-004, FR-011)", () => {
  it("본인이 동의하면 fanSignedAt이 설정된다 (AC-003)", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue(contractFixture());
    mockPrisma.contract.update.mockResolvedValue(contractFixture({ fanSignedAt: new Date() }));

    const result = await signContract(FAN_CTX, "contract-1", true);

    expect(result.ok).toBe(true);
    expect(mockPrisma.contract.update).toHaveBeenCalledOnce();
    const arg = mockPrisma.contract.update.mock.calls[0][0];
    expect(arg.data.fanSignedAt).toBeInstanceOf(Date);
  });

  it("agreed=false면 400, 서명하지 않는다 (AC-002)", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue(contractFixture());
    const result = await signContract(FAN_CTX, "contract-1", false);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
    expect(mockPrisma.contract.update).not.toHaveBeenCalled();
  });

  it("팬 본인이 아니면 403 (AC-006)", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue(contractFixture());
    const result = await signContract(
      { userId: OTHER_FAN_ID, role: "FAN", creatorProfileId: null },
      "contract-1",
      true,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("크리에이터(소유자)는 서명할 수 없다 403 (FR-012)", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue(contractFixture());
    const result = await signContract(CREATOR_CTX, "contract-1", true);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("존재하지 않는 계약은 404", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue(null);
    const result = await signContract(FAN_CTX, "contract-1", true);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });
});

describe("startPayment (FR-005, FR-007, FR-008, NFR-003)", () => {
  function wireTransaction() {
    // $transaction(cb) 형태를 tx로 대리 실행
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => unknown) => {
      return cb(mockPrisma);
    });
  }

  it("서명 완료 후 결제 시 Payment/Settlement/Program/Notification을 생성한다 (AC-004, AC-010)", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue(
      contractFixture({ fanSignedAt: new Date() }),
    );
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    wireTransaction();
    mockPrisma.payment.create.mockResolvedValue({ id: "pay-1", amount: 35000, feeKrw: 3500, status: "PAID" });
    mockPrisma.settlement.create.mockResolvedValue({ id: "set-1", payout: 31500 });
    mockPrisma.program.update.mockResolvedValue({ id: "prog-1", status: "IN_PROGRESS" });
    mockPrisma.notification.create.mockResolvedValue({ id: "n-1" });

    const result = await startPayment(FAN_CTX, "contract-1");

    expect(result.ok).toBe(true);
    // 수수료 10%: 35000 → fee 3500, payout 31500 (AC-010)
    const payArg = mockPrisma.payment.create.mock.calls[0][0];
    expect(payArg.data.feeKrw).toBe(3500);
    expect(payArg.data.status).toBe("PAID");
    const setArg = mockPrisma.settlement.create.mock.calls[0][0];
    expect(setArg.data.payout).toBe(31500);
    expect(setArg.data.status).toBe("PENDING");
    const progArg = mockPrisma.program.update.mock.calls[0][0];
    expect(progArg.data.status).toBe("IN_PROGRESS");
    const notifArg = mockPrisma.notification.create.mock.calls[0][0];
    expect(notifArg.data.type).toBe("PAYMENT_COMPLETED");
    expect(notifArg.data.userId).toBe(FAN_ID);
  });

  it("서명 전이면 결제를 거부한다 400 (FR-005)", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue(contractFixture({ fanSignedAt: null }));
    const result = await startPayment(FAN_CTX, "contract-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("이미 PAID 결제가 있으면 409, 중복 결제를 막는다 (FR-008, AC-005)", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue(contractFixture({ fanSignedAt: new Date() }));
    mockPrisma.payment.findFirst.mockResolvedValue({ id: "pay-existing", status: "PAID" });
    const result = await startPayment(FAN_CTX, "contract-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
  });

  it("팬 본인이 아니면 403 (AC-006)", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue(contractFixture({ fanSignedAt: new Date() }));
    const result = await startPayment(
      { userId: OTHER_FAN_ID, role: "FAN", creatorProfileId: null },
      "contract-1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("트랜잭션 실패 시 500을 반환하고 롤백된다 (AC-009)", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue(contractFixture({ fanSignedAt: new Date() }));
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    mockPrisma.$transaction.mockRejectedValue(new Error("settlement failed"));
    const result = await startPayment(FAN_CTX, "contract-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
  });

  it("동시 결제 경합으로 unique 위반(P2002) 시 409로 매핑한다 (FR-008, AC-005)", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue(contractFixture({ fanSignedAt: new Date() }));
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    mockPrisma.$transaction.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    const result = await startPayment(FAN_CTX, "contract-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
  });

  it("MockPaymentProvider.charge를 호출한다 (FR-007, AC-008)", async () => {
    mockPrisma.contract.findUnique.mockResolvedValue(contractFixture({ fanSignedAt: new Date() }));
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    wireTransaction();
    mockPrisma.payment.create.mockResolvedValue({ id: "pay-1" });
    mockPrisma.settlement.create.mockResolvedValue({ id: "set-1" });
    mockPrisma.program.update.mockResolvedValue({ id: "prog-1" });
    mockPrisma.notification.create.mockResolvedValue({ id: "n-1" });

    await startPayment(FAN_CTX, "contract-1");
    expect(mockCharge).toHaveBeenCalledOnce();
    expect(mockCharge.mock.calls[0][0]).toMatchObject({ contractId: "contract-1", amount: 35000 });
  });
});
