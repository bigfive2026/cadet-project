import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock 호이스팅 대응: factory가 참조하는 mockPrisma를 vi.hoisted로 함께 끌어올린다.
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    post: {
      findUnique: vi.fn(),
    },
    payment: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    settlement: {
      create: vi.fn(),
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

import { purchasePost, type PurchaseServiceContext } from "./post-purchase";

const FAN_ID = "fan-1";
const POST_ID = "post-1";
const CREATOR_PROFILE_ID = "cprof-1";

const FAN_CTX: PurchaseServiceContext = { userId: FAN_ID };

function postFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: POST_ID,
    creatorProfileId: CREATOR_PROFILE_ID,
    visibility: "PAID",
    priceKrw: 5000,
    ...overrides,
  };
}

function wireTransaction() {
  mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => unknown) =>
    cb(mockPrisma),
  );
}

beforeEach(() => {
  Object.values(mockPrisma).forEach((m) => {
    if (typeof m === "function") return;
    Object.values(m as Record<string, ReturnType<typeof vi.fn>>).forEach((fn) => fn.mockReset());
  });
  mockCharge.mockReset();
  mockCharge.mockResolvedValue({ success: true, provider: "mock", providerTxId: "tx", amount: 5000 });
});
afterEach(() => vi.clearAllMocks());

describe("purchasePost (FR-003, FR-004, FR-005, NFR-002, NFR-003)", () => {
  it("미구매 팬이 구매하면 Payment(PAID)/Settlement(PENDING)/Notification을 생성한다 (AC-002, AC-007)", async () => {
    mockPrisma.post.findUnique.mockResolvedValue(postFixture());
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    wireTransaction();
    mockPrisma.payment.create.mockResolvedValue({ id: "pay-1", amount: 5000, feeKrw: 500, status: "PAID" });
    mockPrisma.settlement.create.mockResolvedValue({ id: "set-1", payout: 4500 });
    mockPrisma.notification.create.mockResolvedValue({ id: "n-1" });

    const result = await purchasePost(FAN_CTX, POST_ID);

    expect(result.ok).toBe(true);
    // 수수료 10%: 5000 → fee 500, payout 4500 (AC-007)
    const payArg = mockPrisma.payment.create.mock.calls[0][0];
    expect(payArg.data.postId).toBe(POST_ID);
    expect(payArg.data.fanUserId).toBe(FAN_ID);
    expect(payArg.data.amount).toBe(5000);
    expect(payArg.data.feeKrw).toBe(500);
    expect(payArg.data.status).toBe("PAID");
    const setArg = mockPrisma.settlement.create.mock.calls[0][0];
    expect(setArg.data.payout).toBe(4500);
    expect(setArg.data.status).toBe("PENDING");
    const notifArg = mockPrisma.notification.create.mock.calls[0][0];
    expect(notifArg.data.type).toBe("PAYMENT_COMPLETED");
    expect(notifArg.data.userId).toBe(FAN_ID);
  });

  it("작성자 본인이 자신의 PAID 포스트를 구매하면 400 (AC-005, 자가 결제 방지)", async () => {
    // 작성자는 무료로 열람 가능하므로 결제 레코드 생성이 불필요하다.
    mockPrisma.post.findUnique.mockResolvedValue(
      postFixture({ creatorProfile: { userId: FAN_ID } }),
    );

    const result = await purchasePost(FAN_CTX, POST_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
    expect(mockPrisma.payment.findFirst).not.toHaveBeenCalled();
    expect(mockCharge).not.toHaveBeenCalled();
  });

  it("MockPaymentProvider.charge를 postId 컨텍스트로 호출한다 (FR-003, NFR-006, AC-010)", async () => {
    mockPrisma.post.findUnique.mockResolvedValue(postFixture());
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    wireTransaction();
    mockPrisma.payment.create.mockResolvedValue({ id: "pay-1" });
    mockPrisma.settlement.create.mockResolvedValue({ id: "set-1" });
    mockPrisma.notification.create.mockResolvedValue({ id: "n-1" });

    await purchasePost(FAN_CTX, POST_ID);
    expect(mockCharge).toHaveBeenCalledOnce();
    expect(mockCharge.mock.calls[0][0]).toMatchObject({ postId: POST_ID, amount: 5000 });
  });

  it("priceKrw가 null이면 400, Payment를 생성하지 않는다 (FR-004, AC-008)", async () => {
    mockPrisma.post.findUnique.mockResolvedValue(postFixture({ priceKrw: null }));
    const result = await purchasePost(FAN_CTX, POST_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("priceKrw가 0 이하이면 400 (FR-004)", async () => {
    mockPrisma.post.findUnique.mockResolvedValue(postFixture({ priceKrw: 0 }));
    const result = await purchasePost(FAN_CTX, POST_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("PAID 포스트가 아니면 400 (단건 구매 대상 아님)", async () => {
    mockPrisma.post.findUnique.mockResolvedValue(postFixture({ visibility: "PUBLIC", priceKrw: null }));
    const result = await purchasePost(FAN_CTX, POST_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("이미 PAID 결제가 있으면 409, 새 Payment를 생성하지 않는다 (FR-005, AC-004)", async () => {
    mockPrisma.post.findUnique.mockResolvedValue(postFixture());
    mockPrisma.payment.findFirst.mockResolvedValue({ id: "pay-existing", status: "PAID" });
    const result = await purchasePost(FAN_CTX, POST_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
    expect(mockPrisma.payment.create).not.toHaveBeenCalled();
  });

  it("존재하지 않는 포스트는 404", async () => {
    mockPrisma.post.findUnique.mockResolvedValue(null);
    const result = await purchasePost(FAN_CTX, POST_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("트랜잭션 실패 시 500을 반환하고 롤백된다 (NFR-002, AC-011)", async () => {
    mockPrisma.post.findUnique.mockResolvedValue(postFixture());
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    mockPrisma.$transaction.mockRejectedValue(new Error("settlement failed"));
    const result = await purchasePost(FAN_CTX, POST_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
  });

  it("동시 구매 경합으로 unique 위반(P2002) 시 409로 매핑한다 (FR-005)", async () => {
    mockPrisma.post.findUnique.mockResolvedValue(postFixture());
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    mockPrisma.$transaction.mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    const result = await purchasePost(FAN_CTX, POST_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
  });
});
