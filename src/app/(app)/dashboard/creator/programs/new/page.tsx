import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createProgram } from "@/lib/programs";
import { parseProgramCreateForm } from "@/lib/program-form";
import { programCreateSchema } from "@/lib/validation/program";
import { NewProgramClient } from "@/components/dashboard/NewProgramClient";

/**
 * 크리에이터 프로그램 생성 페이지 (SPEC-004 FR-001, AC-001, 7장 /dashboard/creator/programs/new).
 */
async function createProgramAction(formData: FormData): Promise<void> {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR" || !user.creatorProfile) {
    redirect("/login");
  }

  const parsed = programCreateSchema.safeParse(parseProgramCreateForm(formData));
  if (!parsed.success) {
    return;
  }

  const result = await createProgram(
    { role: user.role, creatorProfileId: user.creatorProfile.id },
    parsed.data,
  );
  if (result.ok) {
    revalidatePath("/programs");
    revalidatePath("/dashboard/creator/programs");
    redirect("/dashboard/creator/programs");
  }
}

export default async function NewProgramPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR") {
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-heading text-xl font-bold">새 클럽 만들기</h1>
      <NewProgramClient action={createProgramAction} />
    </main>
  );
}
