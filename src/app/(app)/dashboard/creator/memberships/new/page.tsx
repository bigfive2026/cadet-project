import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MembershipPlanForm } from "@/components/dashboard/MembershipPlanForm";

/**
 * 크리에이터 멤버십 플랜 생성 페이지 (SPEC-003 FR-001).
 * 비크리에이터 접근 시 리다이렉트.
 */
async function createPlanAction(formData: FormData): Promise<void> {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR" || !user.creatorProfile) {
    redirect("/login");
  }

  const body: Record<string, unknown> = {
    title: formData.get("title"),
    priceKrw: Number(formData.get("priceKrw")),
  };
  const description = formData.get("description");
  if (description) body.description = description;

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/membership-plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    redirect("/dashboard/creator");
  }
}

export default async function NewMembershipPlanPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR") {
    redirect("/login");
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">멤버십 플랜 생성</h1>
      <MembershipPlanForm action={createPlanAction} />
    </main>
  );
}
