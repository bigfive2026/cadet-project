import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listMyMemberships } from "@/lib/queries/members";
import { MyMemberships } from "@/components/community/MyMemberships";

/**
 * 팬 내 멤버십 페이지 (SPEC-007 FR-011, AC-008).
 * 인증된 사용자만 접근 가능 — 본인의 멤버십 목록을 표시한다.
 */
export default async function MyMembershipsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const memberships = await listMyMemberships(user.id);

  return (
    <main className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">내 멤버십</h1>
        <p className="text-sm text-muted-foreground">
          가입한 멤버십 목록입니다.
        </p>
      </header>

      <MyMemberships memberships={memberships} />
    </main>
  );
}
