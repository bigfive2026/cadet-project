import { notFound } from "next/navigation";
import { getCreatorStudio } from "@/lib/queries/studio";
import { getCurrentUser } from "@/lib/auth";
import { isActiveMember } from "@/lib/membership";
import { joinMembership } from "@/app/(app)/creators/[creatorId]/actions";
import { StudioTabs } from "@/components/studio/StudioTabs";

/**
 * 크리에이터 스튜디오 상세 페이지 (SPEC-002 FR-011, SPEC-003 FR-003, FR-006, AC-003).
 * isActiveMember를 서버에서 계산하여 StudioTabs에 전달한다 (NFR-002).
 * joinAction Server Action을 클라이언트 컴포넌트에 prop으로 전달.
 */
export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ creatorId: string }>;
}) {
  const { creatorId } = await params;
  const [studio, currentUser] = await Promise.all([
    getCreatorStudio(creatorId),
    getCurrentUser(),
  ]);

  if (!studio) {
    notFound();
  }

  // 서버에서 멤버 여부 판단 — 비로그인이면 false
  const memberStatus = currentUser
    ? await isActiveMember(currentUser.id, creatorId)
    : false;

  // Server Action: 멤버십 가입 (planId 바인딩)
  async function handleJoin(planId: string): Promise<void> {
    "use server";
    await joinMembership(planId);
  }

  return <StudioTabs studio={studio} isActiveMember={memberStatus} joinAction={handleJoin} />;
}
