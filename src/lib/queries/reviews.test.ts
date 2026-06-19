import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockReviewFindMany = vi.fn();
const mockReviewAggregate = vi.fn();
const mockReviewFindFirst = vi.fn();
const mockPaymentFindFirst = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    review: {
      findMany: (...a: unknown[]) => mockReviewFindMany(...a),
      aggregate: (...a: unknown[]) => mockReviewAggregate(...a),
      findFirst: (...a: unknown[]) => mockReviewFindFirst(...a),
    },
    payment: {
      findFirst: (...a: unknown[]) => mockPaymentFindFirst(...a),
    },
  },
}));

import {
  getCreatorRating,
  getReviewEligibility,
  listProgramReviews,
} from "@/lib/queries/reviews";

beforeEach(() => {
  mockReviewFindMany.mockReset();
  mockReviewAggregate.mockReset();
  mockReviewFindFirst.mockReset();
  mockPaymentFindFirst.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("listProgramReviews (FR-011, AC-010, AC-012)", () => {
  it("programId로 필터하고 최신순 정렬한다", async () => {
    mockReviewFindMany.mockResolvedValue([]);
    await listProgramReviews("prog-1");
    const arg = mockReviewFindMany.mock.calls[0][0];
    expect(arg.where.programId).toBe("prog-1");
    expect(arg.orderBy.createdAt).toBe("desc");
  });

  it("리뷰가 있으면 산술 평균(소수 1자리)을 계산한다 (AC-010: 4,5 → 4.5)", async () => {
    mockReviewFindMany.mockResolvedValue([{ rating: 4 }, { rating: 5 }]);
    const { avgRating, reviews } = await listProgramReviews("prog-1");
    expect(reviews).toHaveLength(2);
    expect(avgRating).toBe(4.5);
  });

  it("평균은 소수 1자리로 반올림한다 (5,4,3 → 4.0)", async () => {
    mockReviewFindMany.mockResolvedValue([{ rating: 5 }, { rating: 4 }, { rating: 3 }]);
    const { avgRating } = await listProgramReviews("prog-1");
    expect(avgRating).toBe(4.0);
  });

  it("리뷰가 없으면 avgRating=null (AC-012)", async () => {
    mockReviewFindMany.mockResolvedValue([]);
    const { avgRating, reviews } = await listProgramReviews("prog-1");
    expect(reviews).toEqual([]);
    expect(avgRating).toBeNull();
  });
});

describe("getCreatorRating (FR-012, AC-011, AC-012)", () => {
  it("크리에이터 소유 프로그램의 리뷰를 집계한다", async () => {
    mockReviewAggregate.mockResolvedValue({
      _avg: { rating: 4 },
      _count: { rating: 3 },
    });
    const result = await getCreatorRating("cprof-1");
    const arg = mockReviewAggregate.mock.calls[0][0];
    expect(arg.where.program.creatorProfileId).toBe("cprof-1");
    expect(result.avg).toBe(4.0);
    expect(result.count).toBe(3);
  });

  it("리뷰가 없으면 avg=null, count=0 (AC-012)", async () => {
    mockReviewAggregate.mockResolvedValue({
      _avg: { rating: null },
      _count: { rating: 0 },
    });
    const result = await getCreatorRating("cprof-1");
    expect(result.avg).toBeNull();
    expect(result.count).toBe(0);
  });

  it("평균을 소수 1자리로 반올림한다 (4.1666 → 4.2)", async () => {
    mockReviewAggregate.mockResolvedValue({
      _avg: { rating: 4.166666 },
      _count: { rating: 6 },
    });
    const result = await getCreatorRating("cprof-1");
    expect(result.avg).toBe(4.2);
  });
});

describe("getReviewEligibility (FR-005, FR-006, FR-009)", () => {
  it("비로그인이면 canReview=false, alreadyReviewed=false", async () => {
    const result = await getReviewEligibility("prog-1", null);
    expect(result).toEqual({ canReview: false, alreadyReviewed: false });
  });

  it("결제 완료 + 미작성이면 canReview=true, alreadyReviewed=false", async () => {
    mockPaymentFindFirst.mockResolvedValue({ id: "pay-1" });
    mockReviewFindFirst.mockResolvedValue(null);
    const result = await getReviewEligibility("prog-1", "fan-1");
    expect(result).toEqual({ canReview: true, alreadyReviewed: false });
  });

  it("결제 완료 + 이미 작성이면 canReview=true, alreadyReviewed=true", async () => {
    mockPaymentFindFirst.mockResolvedValue({ id: "pay-1" });
    mockReviewFindFirst.mockResolvedValue({ id: "rev-1" });
    const result = await getReviewEligibility("prog-1", "fan-1");
    expect(result).toEqual({ canReview: true, alreadyReviewed: true });
  });

  it("미결제/비참여자면 canReview=false", async () => {
    mockPaymentFindFirst.mockResolvedValue(null);
    mockReviewFindFirst.mockResolvedValue(null);
    const result = await getReviewEligibility("prog-1", "fan-1");
    expect(result.canReview).toBe(false);
  });
});
