import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { updateProgram } from "@/lib/programs";
import { getProgramDetail } from "@/lib/queries/programs";
import { parseProgramUpdateForm } from "@/lib/program-form";
import { programUpdateSchema } from "@/lib/validation/program";
import { ProgramForm, type ProgramFormInitial } from "@/components/dashboard/ProgramForm";

/** Date → 'YYYY-MM-DD' (date input value). */
function toDateInput(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/**
 * 크리에이터 프로그램 수정 페이지 (SPEC-004 FR-006, AC-005, 7장 .../[id]/edit).
 * 본인 프로그램이 아니면 404. 갱신 인가/전이 검증은 서비스가 재확인한다.
 */
export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR" || !user.creatorProfile) {
    redirect("/login");
  }

  const program = await getProgramDetail(id);
  if (!program || program.creatorProfile?.id !== user.creatorProfile.id) {
    notFound();
  }

  const initial: ProgramFormInitial = {
    title: program.title,
    description: program.description,
    priceKrw: program.priceKrw,
    category: program.category,
    startDate: toDateInput(program.startDate),
    endDate: toDateInput(program.endDate),
    recruitDeadline: toDateInput(program.recruitDeadline),
    maxParticipants: program.maxParticipants,
    status: program.status,
  };

  async function updateProgramAction(formData: FormData): Promise<void> {
    "use server";
    const current = await getCurrentUser();
    if (!current || current.role !== "CREATOR" || !current.creatorProfile) {
      redirect("/login");
    }

    const parsed = programUpdateSchema.safeParse(parseProgramUpdateForm(formData));
    if (!parsed.success) {
      return;
    }

    const result = await updateProgram(
      { role: current.role, creatorProfileId: current.creatorProfile.id },
      id,
      parsed.data,
    );
    if (result.ok) {
      revalidatePath("/programs");
      revalidatePath(`/programs/${id}`);
      revalidatePath("/dashboard/creator/programs");
      redirect("/dashboard/creator/programs");
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-heading text-xl font-bold">클럽 수정</h1>
      <ProgramForm action={updateProgramAction} initial={initial} mode="edit" />
    </main>
  );
}
