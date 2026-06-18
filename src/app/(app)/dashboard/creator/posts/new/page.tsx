import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PostCreateForm } from "@/components/dashboard/PostCreateForm";

/**
 * 크리에이터 포스트 생성 페이지 (SPEC-003 FR-012).
 * 비크리에이터 접근 시 리다이렉트.
 */
async function createPostAction(formData: FormData): Promise<void> {
  "use server";
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR" || !user.creatorProfile) {
    redirect("/login");
  }

  const body: Record<string, unknown> = {
    title: formData.get("title"),
    body: formData.get("body"),
    visibility: formData.get("visibility"),
  };
  const priceKrw = formData.get("priceKrw");
  if (priceKrw) body.priceKrw = Number(priceKrw);

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    redirect("/dashboard/creator");
  }
}

export default async function NewPostPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR") {
    redirect("/login");
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">새 포스트 작성</h1>
      <PostCreateForm action={createPostAction} />
    </main>
  );
}
