import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProgramDetail } from "@/lib/queries/programs";
import { listProgramParticipants } from "@/lib/queries/members";
import { ParticipantList } from "@/components/community/ParticipantList";

/**
 * 크리에이터 프로그램 참여자 명단 페이지 (SPEC-007 FR-009, FR-010, AC-007).
 * CREATOR 본인 + 본인 프로그램만 접근 가능 (비소유 → notFound).
 */
export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR" || !user.creatorProfile) {
    redirect("/login");
  }

  // 프로그램 로드 및 본인 소유 여부 확인 (FR-010)
  const program = await getProgramDetail(id);
  if (!program || program.creatorProfile?.id !== user.creatorProfile.id) {
    notFound();
  }

  const participants = await listProgramParticipants(id);

  return (
    <main className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">참여자 명단</h1>
        <p className="text-sm text-muted-foreground">
          {program.title}의 수락된 참여자 목록입니다.
        </p>
      </header>

      <ParticipantList participants={participants} />
    </main>
  );
}
