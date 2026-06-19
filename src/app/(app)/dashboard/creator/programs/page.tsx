import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { deleteProgram } from "@/lib/programs";
import { listCreatorPrograms } from "@/lib/queries/programs";
import { Button } from "@/components/ui/button";
import { ProgramStatusBadge } from "@/components/programs/ProgramStatusBadge";
import { formatKrw } from "@/components/studio/MembershipPlanCardList";

/**
 * 크리에이터 본인 프로그램 목록 (SPEC-004 FR-010, AC-008, 7장 /dashboard/creator/programs).
 * DRAFT 포함 본인 전체 프로그램을 상태 배지와 함께 표시. 행별 편집/삭제.
 */
export default async function CreatorProgramsPage() {
  const user = await requireRole("CREATOR");
  if (!user.creatorProfile) {
    redirect("/dashboard/creator");
  }
  const programs = await listCreatorPrograms(user.creatorProfile.id);

  async function deleteProgramAction(formData: FormData): Promise<void> {
    "use server";
    const current = await requireRole("CREATOR");
    if (!current.creatorProfile) {
      redirect("/login");
    }
    const id = String(formData.get("id"));
    await deleteProgram(
      { role: current.role, creatorProfileId: current.creatorProfile.id },
      id,
    );
    revalidatePath("/programs");
    revalidatePath("/dashboard/creator/programs");
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-heading text-2xl font-bold tracking-tight">내 클럽</h1>
        <Link
          href="/dashboard/creator/programs/new"
          className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          새 클럽 만들기
        </Link>
      </header>

      {programs.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 만든 클럽이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {programs.map((program) => (
            <li
              key={program.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{program.title}</span>
                  <ProgramStatusBadge status={program.status} />
                </div>
                <p className="text-xs text-muted-foreground">{formatKrw(program.priceKrw)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/dashboard/creator/programs/${program.id}/edit`}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  편집
                </Link>
                <form action={deleteProgramAction}>
                  <input type="hidden" name="id" value={program.id} />
                  <Button type="submit" size="sm" variant="outline">
                    삭제
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
