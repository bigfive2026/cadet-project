import { redirect } from "next/navigation";

/**
 * 크리에이터 본인 프로그램 상세 진입점 (SPEC-008 §7).
 * 완료 승인(CompleteButton)은 공개 상세(/programs/[id])의 owner 뷰에서
 * 통합 제공되므로 여기서는 상세 페이지로 리다이렉트한다.
 */
export default async function CreatorProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/programs/${id}`);
}
