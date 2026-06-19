import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listActiveMembers } from "@/lib/queries/members";
import { MemberList } from "@/components/community/MemberList";

/**
 * 크리에이터 멤버 관리 페이지 (SPEC-007 FR-008, FR-010, AC-006).
 * CREATOR 본인만 접근 가능 — 소유 검증은 본인 creatorProfile.id로 조회하므로 암묵적.
 */
export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CREATOR" || !user.creatorProfile) {
    redirect("/login");
  }

  const members = await listActiveMembers(user.creatorProfile.id);

  return (
    <main className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">멤버 관리</h1>
        <p className="text-sm text-muted-foreground">
          내 스튜디오의 활성 멤버 목록입니다.
        </p>
      </header>

      <MemberList members={members} />
    </main>
  );
}
