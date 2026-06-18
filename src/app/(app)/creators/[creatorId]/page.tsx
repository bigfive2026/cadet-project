import { notFound } from "next/navigation";
import { getCreatorStudio } from "@/lib/queries/studio";
import { StudioTabs } from "@/components/studio/StudioTabs";

/**
 * 크리에이터 스튜디오 상세 페이지 (SPEC-002 FR-011, AC-002, AC-003, AC-007).
 * Next 16: params는 Promise. await 후 getCreatorStudio 호출.
 * 존재하지 않으면 notFound() → 404.
 */
export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ creatorId: string }>;
}) {
  const { creatorId } = await params;
  const studio = await getCreatorStudio(creatorId);
  if (!studio) {
    notFound();
  }
  return <StudioTabs studio={studio} />;
}
