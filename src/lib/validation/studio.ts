import { z } from "zod";

/**
 * 스튜디오 편집 폼 검증 스키마 (SPEC-002 AC-005, FR-006).
 * URL 필드는 빈 문자열("") 허용 → 라우트 핸들러에서 null(필드 해제)로 매핑.
 * 유효한 문자열인 경우에만 URL 형식을 검사한다.
 */
const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal(""));

export const studioUpdateSchema = z.object({
  creatorProfileId: z.string().min(1),
  studioName: z.string().min(1).max(80).optional(),
  bio: z.string().max(500).optional(),
  coverImageUrl: optionalUrl,
  profileImageUrl: optionalUrl,
  category: z.string().max(40).optional(),
  instagramUrl: optionalUrl,
  websiteUrl: optionalUrl,
});

export type StudioUpdateInput = z.infer<typeof studioUpdateSchema>;
