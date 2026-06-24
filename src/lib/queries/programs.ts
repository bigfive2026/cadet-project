import { prisma } from "@/lib/prisma";
import { PUBLIC_PROGRAM_STATUSES } from "@/lib/program-status";
import type { ProgramStatus } from "@prisma/client";

/**
 * 프로그램 조회(read) 쿼리 (SPEC-004 FR-003, FR-004, FR-010, FR-011, NFR-004).
 * 공개 목록은 deletedAt IS NULL AND status IN (...) 인덱스 활용 쿼리로 로드한다.
 */

/** 공개 목록(/programs) 필터 파라미터 (PRD §4.2 P1 검색/필터). */
export interface PublicProgramFilter {
  category?: string;
  /** 단일 공개 상태로 좁힘. PUBLIC_PROGRAM_STATUSES 화이트리스트 밖은 무시. */
  status?: ProgramStatus;
  /** 가격 상한(KRW). */
  priceMax?: number;
  /** 제목/설명 부분 일치 검색어. */
  q?: string;
  /** 정렬 기준. 기본 최신순. */
  sort?: "latest" | "price_asc" | "price_desc";
}

/** 공개 목록(/programs) — DRAFT/CANCELLED 및 soft-delete 제외 (FR-003). */
export function listPublicPrograms(opts?: PublicProgramFilter) {
  const statusFilter = opts?.status && PUBLIC_PROGRAM_STATUSES.includes(opts.status)
    ? opts.status
    : { in: PUBLIC_PROGRAM_STATUSES };

  const orderBy =
    opts?.sort === "price_asc"
      ? { priceKrw: "asc" as const }
      : opts?.sort === "price_desc"
        ? { priceKrw: "desc" as const }
        : { createdAt: "desc" as const };

  return prisma.program.findMany({
    where: {
      deletedAt: null,
      status: statusFilter,
      ...(opts?.category ? { category: opts.category } : {}),
      ...(opts?.priceMax !== undefined
        ? { priceKrw: { lte: opts.priceMax } }
        : {}),
      ...(opts?.q
        ? {
            OR: [
              { title: { contains: opts.q, mode: "insensitive" } },
              { description: { contains: opts.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy,
    include: {
      creatorProfile: { select: { id: true, studioName: true, profileImageUrl: true } },
    },
  });
}

/**
 * 공개 프로그램에 사용된 카테고리 목록 (필터 드롭다운용, PRD §4.2).
 * category 는 자유 문자열이므로 실제 데이터 기반으로 distinct 조회한다.
 */
export function listProgramCategories() {
  return prisma.program.findMany({
    where: {
      deletedAt: null,
      status: { in: PUBLIC_PROGRAM_STATUSES },
      category: { not: null },
    },
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });
}

/** 공개 상세(/programs/[id]) — 존재하지 않거나 soft-delete면 null → 404 (FR-004, FR-011, AC-007). */
export function getProgramDetail(id: string) {
  return prisma.program.findFirst({
    where: { id, deletedAt: null },
    include: {
      creatorProfile: { select: { id: true, studioName: true, profileImageUrl: true } },
    },
  });
}

/** 크리에이터 본인 대시보드 목록 — DRAFT 포함, deletedAt IS NULL (FR-010, AC-008). */
export function listCreatorPrograms(creatorProfileId: string) {
  return prisma.program.findMany({
    where: { creatorProfileId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}
