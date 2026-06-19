import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted: factory가 참조하는 mockPrisma를 호이스팅한다 (memory: vi.hoisted 필수).
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    program: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    settlement: {
      update: vi.fn(),
    },
    review: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import {
  completeProgram,
  createReview,
  type ReviewServiceContext,
} from "./reviews";

const FAN_ID = "fan-1";
const FAN2_ID = "fan-2";
const CREATOR_PROFILE_ID = "cprof-1";
const PROGRAM_ID = "prog-1";

const CREATOR_CTX: ReviewServiceContext = {
  userId: "creator-user-1",
  role: "CREATOR",
  creatorProfileId: CREATOR_PROFILE_ID,
};

const FAN_CTX: ReviewServiceContext = {
  userId: FAN_ID,
  role: "FAN",
  creatorProfileId: null,
};

function programFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: PROGRAM_ID,
    status: "IN_PROGRESS",
    creatorProfileId: CREATOR_PROFILE_ID,
    deletedAt: null,
    ...overrides,
  };
}

function wireTransaction() {
  // $transaction(cb)를 mockPrisma(tx)로 대리 실행
  mockPrisma.$transaction.mockImplementation(
    async (cb: (tx: typeof mockPrisma) => unknown) => cb(mockPrisma),
  );
}

beforeEach(() => {
  Object.values(mockPrisma).forEach((m) => {
    if (typeof m === "function") return;
    Object.values(m as Record<string, ReturnType<typeof vi.fn>>).forEach((fn) =>
      fn.mockReset(),
    );
  });
});

afterEach(() => vi.clearAllMocks());

describe("completeProgram (FR-001~FR-004, NFR-001)", () => {
  it("IN_PROGRESS 소유 프로그램을 COMPLETED + RELEASED + 알림으로 전환한다 (AC-001)", async () => {
    mockPrisma.program.findUnique.mockResolvedValue(programFixture());
    wireTransaction();
    mockPrisma.payment.findMany.mockResolvedValue([
      { id: "pay-1", fanUserId: FAN_ID },
      { id: "pay-2", fanUserId: FAN2_ID },
    ]);
    mockPrisma.payment.update.mockResolvedValue({ id: "pay-1" });
    mockPrisma.settlement.update.mockResolvedValue({ id: "set-1" });
    mockPrisma.notification.create.mockResolvedValue({ id: "n-1" });

    const result = await completeProgram(CREATOR_CTX, PROGRAM_ID);

    expect(result.ok).toBe(true);
    // Program → COMPLETED
    const progArg = mockPrisma.program.update.mock.calls[0][0];
    expect(progArg.data.status).toBe("COMPLETED");
    // 두 결제 모두 RELEASED
    expect(mockPrisma.payment.update).toHaveBeenCalledTimes(2);
    const payArgs = mockPrisma.payment.update.mock.calls.map((c) => c[0].data.status);
    expect(payArgs).toEqual(["RELEASED", "RELEASED"]);
    // 정산도 RELEASED
    expect(mockPrisma.settlement.update).toHaveBeenCalledTimes(2);
    // fan당 1회 알림
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);
    const notifArg = mockPrisma.notification.create.mock.calls[0][0];
    expect(notifArg.data.type).toBe("REVIEW_REQUESTED");
    expect(notifArg.data.linkUrl).toBe(`/programs/${PROGRAM_ID}`);
    if (result.ok) {
      expect(result.data.releasedPayments).toBe(2);
      expect(result.data.releasedSettlements).toBe(2);
      expect(result.data.notifiedParticipants).toBe(2);
    }
  });

  it("동일 fan의 결제가 여러 건이면 알림은 1회만 생성한다", async () => {
    mockPrisma.program.findUnique.mockResolvedValue(programFixture());
    wireTransaction();
    mockPrisma.payment.findMany.mockResolvedValue([
      { id: "pay-1", fanUserId: FAN_ID },
      { id: "pay-2", fanUserId: FAN_ID },
    ]);
    mockPrisma.payment.update.mockResolvedValue({ id: "pay-1" });
    mockPrisma.settlement.update.mockResolvedValue({ id: "set-1" });
    mockPrisma.notification.create.mockResolvedValue({ id: "n-1" });

    const result = await completeProgram(CREATOR_CTX, PROGRAM_ID);

    if (result.ok) expect(result.data.notifiedParticipants).toBe(1);
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it("비소유 크리에이터/팬이면 403 (FR-003, AC-002)", async () => {
    mockPrisma.program.findUnique.mockResolvedValue(programFixture());
    const result = await completeProgram(FAN_CTX, PROGRAM_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("IN_PROGRESS가 아니면 400 (FR-004, AC-003)", async () => {
    mockPrisma.program.findUnique.mockResolvedValue(
      programFixture({ status: "RECRUITING" }),
    );
    const result = await completeProgram(CREATOR_CTX, PROGRAM_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("미존재 또는 soft-delete면 404", async () => {
    mockPrisma.program.findUnique.mockResolvedValue(null);
    const result = await completeProgram(CREATOR_CTX, PROGRAM_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);

    mockPrisma.program.findUnique.mockResolvedValue(
      programFixture({ deletedAt: new Date() }),
    );
    const result2 = await completeProgram(CREATOR_CTX, PROGRAM_ID);
    expect(result2.ok).toBe(false);
    if (!result2.ok) expect(result2.status).toBe(404);
  });

  it("트랜잭션 실패 시 500 (AC-004)", async () => {
    mockPrisma.program.findUnique.mockResolvedValue(programFixture());
    mockPrisma.$transaction.mockRejectedValue(new Error("boom"));
    const result = await completeProgram(CREATOR_CTX, PROGRAM_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
  });

  it("settlement 갱신 실패 시 트랜잭션이 롤백되어 500 (AC-004, NFR-001)", async () => {
    // Settlement 에러가 .catch로 삼켜지지 않고 트랜잭션 전체를 reject시키는지 검증.
    mockPrisma.program.findUnique.mockResolvedValue(programFixture());
    wireTransaction();
    mockPrisma.payment.findMany.mockResolvedValue([
      { id: "pay-1", fanUserId: FAN_ID },
    ]);
    mockPrisma.payment.update.mockResolvedValue({ id: "pay-1" });
    mockPrisma.settlement.update.mockRejectedValue(new Error("settlement boom"));
    mockPrisma.notification.create.mockResolvedValue({ id: "n-1" });

    const result = await completeProgram(CREATOR_CTX, PROGRAM_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(500);
    // Payment=RELEASED는 시도되었으나, Settlement 실패로 커밋되지 않아야 한다(롤백).
    expect(mockPrisma.payment.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.settlement.update).toHaveBeenCalledTimes(1);
  });
});

describe("createReview (FR-005~FR-010, NFR-003)", () => {
  it("COMPLETED + 결제 완료 참여자가 리뷰를 생성한다 (AC-005)", async () => {
    mockPrisma.program.findUnique.mockResolvedValue(
      programFixture({ status: "COMPLETED" }),
    );
    mockPrisma.payment.findFirst.mockResolvedValue({ id: "pay-1" });
    mockPrisma.review.findFirst.mockResolvedValue(null);
    mockPrisma.review.create.mockResolvedValue({
      id: "rev-1",
      rating: 5,
      comment: "좋았습니다",
    });

    const result = await createReview(FAN_CTX, PROGRAM_ID, {
      rating: 5,
      comment: "좋았습니다",
      tags: ["소통이 좋아요"],
    });

    expect(result.ok).toBe(true);
    const arg = mockPrisma.review.create.mock.calls[0][0];
    expect(arg.data).toMatchObject({
      programId: PROGRAM_ID,
      userId: FAN_ID,
      rating: 5,
      comment: "좋았습니다",
      tags: ["소통이 좋아요"],
    });
  });

  it("이미 리뷰가 있으면 409 (FR-006, AC-006)", async () => {
    mockPrisma.program.findUnique.mockResolvedValue(
      programFixture({ status: "COMPLETED" }),
    );
    mockPrisma.payment.findFirst.mockResolvedValue({ id: "pay-1" });
    mockPrisma.review.findFirst.mockResolvedValue({ id: "rev-existing" });

    const result = await createReview(FAN_CTX, PROGRAM_ID, {
      rating: 4,
      comment: null,
      tags: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
    expect(mockPrisma.review.create).not.toHaveBeenCalled();
  });

  it("COMPLETED가 아니면 400 (FR-008, AC-008)", async () => {
    mockPrisma.program.findUnique.mockResolvedValue(
      programFixture({ status: "IN_PROGRESS" }),
    );
    const result = await createReview(FAN_CTX, PROGRAM_ID, {
      rating: 5,
      comment: null,
      tags: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("미결제/비참여자면 403 (FR-009, AC-009)", async () => {
    mockPrisma.program.findUnique.mockResolvedValue(
      programFixture({ status: "COMPLETED" }),
    );
    mockPrisma.payment.findFirst.mockResolvedValue(null);
    const result = await createReview(FAN_CTX, PROGRAM_ID, {
      rating: 5,
      comment: null,
      tags: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("미존재 프로그램이면 404", async () => {
    mockPrisma.program.findUnique.mockResolvedValue(null);
    const result = await createReview(FAN_CTX, PROGRAM_ID, {
      rating: 5,
      comment: null,
      tags: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });

  it("경합 unique 위반(P2002) 시 409 (NFR-003)", async () => {
    mockPrisma.program.findUnique.mockResolvedValue(
      programFixture({ status: "COMPLETED" }),
    );
    mockPrisma.payment.findFirst.mockResolvedValue({ id: "pay-1" });
    mockPrisma.review.findFirst.mockResolvedValue(null);
    mockPrisma.review.create.mockRejectedValue(
      Object.assign(new Error("unique"), { code: "P2002" }),
    );

    const result = await createReview(FAN_CTX, PROGRAM_ID, {
      rating: 5,
      comment: null,
      tags: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
  });
});
