import { requireRole } from "@/lib/auth";
import { StudioEditForm } from "@/components/studio/StudioEditForm";

/**
 * 스튜디오 편집 페이지 (SPEC-002 AC-005).
 * CREATOR만 접근. getCurrentUser().creatorProfile로 폼 prefill.
 */
export default async function CreatorEditPage() {
  const user = await requireRole("CREATOR");
  const profile = user.creatorProfile;
  if (!profile) {
    throw new Error("연결된 크리에이터 프로필이 없습니다.");
  }
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">스튜디오 편집</h1>
        <p className="text-sm text-muted-foreground">스튜디오 정보를 수정하세요.</p>
      </header>
      <StudioEditForm profile={profile} />
    </div>
  );
}
