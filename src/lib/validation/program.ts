import { z } from "zod";

/**
 * 프로그램(클럽) 검증 스키마 (SPEC-004 FR-001, FR-006, NFR-003).
 *
 * - 날짜 필드는 폼/JSON에서 문자열로 전달되므로 z.coerce.date()로 변환한다.
 * - 생성 시 status는 선택값이며 기본값은 라우트/서비스에서 RECRUITING을 적용한다.
 * - 수정 시 모든 필드가 선택값이고, nullable 필드는 null로 초기화할 수 있다.
 */
export const PROGRAM_STATUSES = [
  "DRAFT",
  "RECRUITING",
  "CLOSED",
  "CONTRACTING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

/** 빈 문자열을 undefined로 흘려보내고, 그 외에는 Date로 강제 변환한다. */
const dateLike = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.date(),
);

const nullableDate = z.preprocess(
  (v) => (v === "" ? null : v),
  z.union([z.coerce.date(), z.null()]),
);

export const programCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priceKrw: z.number().int().min(0),
  category: z.string().max(100).optional(),
  startDate: dateLike.optional(),
  endDate: dateLike.optional(),
  recruitDeadline: dateLike.optional(),
  maxParticipants: z.number().int().positive().optional(),
  status: z.enum(PROGRAM_STATUSES).optional(),
});

export const programUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).nullable().optional(),
    priceKrw: z.number().int().min(0).optional(),
    category: z.string().max(100).nullable().optional(),
    startDate: nullableDate.optional(),
    endDate: nullableDate.optional(),
    recruitDeadline: nullableDate.optional(),
    maxParticipants: z.number().int().positive().nullable().optional(),
    status: z.enum(PROGRAM_STATUSES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "수정할 필드가 최소 하나 이상 필요합니다.",
  });

export type ProgramCreateInput = z.infer<typeof programCreateSchema>;
export type ProgramUpdateInput = z.infer<typeof programUpdateSchema>;
