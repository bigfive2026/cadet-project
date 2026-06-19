import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProgramDetail } from "@/lib/queries/programs";
import { listApplicationsForCreator } from "@/lib/queries/applications";
import { ApplicationList } from "@/components/applications/ApplicationList";

/**
 * 크리에이터 프로그램 신청 관리 페이지 (SPEC-005 FR-002, AC-003, AC-004).
 *
 * - CREATOR role만 접근 가능
 * - 본인 프로그램만 조회 가능
 * - 신청 목록을 표시하고 수락/거절 처리 가능
 */
export default async function ApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  // CREATOR role 확인
  if (!user || user.role !== "CREATOR" || !user.creatorProfile) {
    redirect("/login");
  }

  // 프로그램 로드 및 본인 소유 여부 확인
  const program = await getProgramDetail(id);
  if (!program || program.creatorProfile?.id !== user.creatorProfile.id) {
    notFound();
  }

  // 신청 목록 로드
  const applications = await listApplicationsForCreator(id);

  return (
    <main className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">신청 관리</h1>
        <p className="text-sm text-muted-foreground">
          {program.title}의 참여 신청 목록입니다.
        </p>
      </header>

      <ApplicationList programId={id} applications={applications} />
    </main>
  );
}
