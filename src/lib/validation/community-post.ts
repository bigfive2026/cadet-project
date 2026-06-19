import { z } from "zod";

/**
 * 커뮤니티 글 생성 스키마 (SPEC-007 FR-004, AC-004).
 * creatorProfileId(대상 크리에이터), title, content를 검증한다.
 */
export const communityPostCreateSchema = z.object({
  creatorProfileId: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

export type CommunityPostCreateInput = z.infer<typeof communityPostCreateSchema>;

/**
 * 커뮤니티 글 수정 스키마 (SPEC-007 FR-006).
 * title 또는 content 중 최소 하나는 제공되어야 한다 (부분 수정).
 */
export const communityPostUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
  })
  .refine((data) => data.title !== undefined || data.content !== undefined, {
    message: "수정할 title 또는 content가 필요합니다.",
  });

export type CommunityPostUpdateInput = z.infer<typeof communityPostUpdateSchema>;
