import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    program: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
    },
  },
}));

import { getProgramDetail, listCreatorPrograms, listPublicPrograms, listProgramCategories } from "@/lib/queries/programs";

beforeEach(() => {
  mockFindMany.mockReset();
  mockFindFirst.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("listPublicPrograms (FR-003, NFR-004)", () => {
  it("deletedAt:null + 공개 상태 필터로 조회한다", async () => {
    mockFindMany.mockResolvedValue([]);
    await listPublicPrograms();
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.where.deletedAt).toBeNull();
    expect(arg.where.status.in).toContain("RECRUITING");
    expect(arg.where.status.in).not.toContain("DRAFT");
  });

  it("category 옵션이 있으면 where에 포함한다", async () => {
    mockFindMany.mockResolvedValue([]);
    await listPublicPrograms({ category: "클래스" });
    expect(mockFindMany.mock.calls[0][0].where.category).toBe("클래스");
  });

  it("status 옵션이 공개 상태면 단일 상태로 좁힌다", async () => {
    mockFindMany.mockResolvedValue([]);
    await listPublicPrograms({ status: "RECRUITING" });
    expect(mockFindMany.mock.calls[0][0].where.status).toBe("RECRUITING");
  });

  it("status 옵션이 화이트리스트 밖이면 무시하고 전체 공개 상태를 쓴다", async () => {
    mockFindMany.mockResolvedValue([]);
    await listPublicPrograms({ status: "DRAFT" as never });
    expect(mockFindMany.mock.calls[0][0].where.status.in).toContain("RECRUITING");
  });

  it("priceMax 옵션이 가격 상한 조건을 추가한다", async () => {
    mockFindMany.mockResolvedValue([]);
    await listPublicPrograms({ priceMax: 30000 });
    expect(mockFindMany.mock.calls[0][0].where.priceKrw).toEqual({ lte: 30000 });
  });

  it("q 옵션이 제목/설명 부분일치 조건을 추가한다", async () => {
    mockFindMany.mockResolvedValue([]);
    await listPublicPrograms({ q: "워크숍" });
    const where = mockFindMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { title: { contains: "워크숍", mode: "insensitive" } },
      { description: { contains: "워크숍", mode: "insensitive" } },
    ]);
  });
});

describe("listProgramCategories (PRD §4.2)", () => {
  it("공개 프로그램의 distinct 카테고리를 조회한다", async () => {
    mockFindMany.mockResolvedValue([{ category: "회화" }, { category: "클래스" }]);
    const result = await listProgramCategories();
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.distinct).toEqual(["category"]);
    expect(arg.where.category).toEqual({ not: null });
    expect(result).toEqual([{ category: "회화" }, { category: "클래스" }]);
  });
});

describe("getProgramDetail (FR-004, FR-011, AC-007)", () => {
  it("deletedAt:null 조건으로 단건 조회한다", async () => {
    mockFindFirst.mockResolvedValue(null);
    await getProgramDetail("p1");
    expect(mockFindFirst.mock.calls[0][0].where).toMatchObject({ id: "p1", deletedAt: null });
  });
});

describe("listCreatorPrograms (FR-010, AC-008)", () => {
  it("본인 프로필 전체 프로그램(DRAFT 포함, deletedAt:null)을 조회한다", async () => {
    mockFindMany.mockResolvedValue([]);
    await listCreatorPrograms("p-A");
    const arg = mockFindMany.mock.calls[0][0];
    expect(arg.where).toMatchObject({ creatorProfileId: "p-A", deletedAt: null });
    expect(arg.where.status).toBeUndefined();
  });
});
