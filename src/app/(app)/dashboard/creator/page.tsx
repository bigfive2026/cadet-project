import Link from "next/link";
import { requireRole } from "@/lib/auth";

/**
 * 크리에이터 대시보드 요약 (SPEC-002 AC-004).
 * CREATOR만 접근 가능. 스튜디오 요약 + 주요 액션 링크.
 */
export default async function CreatorDashboardPage() {
  const user = await requireRole("CREATOR");
  const profile = user.creatorProfile;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight">크리에이터 스튜디오</h1>
        <p className="text-sm text-muted-foreground">안녕하세요, {user.name}님.</p>
      </header>

      {profile ? (
        <section className="space-y-2 rounded-xl border p-4">
          <h2 className="font-heading text-lg font-semibold">{profile.studioName}</h2>
          {profile.bio ? (
            <p className="text-sm text-muted-foreground">{profile.bio}</p>
          ) : null}
          <dl className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {profile.category ? (
              <>
                <dt>카테고리</dt>
                <dd>{profile.category}</dd>
              </>
            ) : null}
            {profile.instagramUrl ? (
              <>
                <dt>Instagram</dt>
                <dd className="truncate">{profile.instagramUrl}</dd>
              </>
            ) : null}
            {profile.websiteUrl ? (
              <>
                <dt>Website</dt>
                <dd className="truncate">{profile.websiteUrl}</dd>
              </>
            ) : null}
          </dl>
          <div>
            <Link
              href="/dashboard/creator/edit"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              스튜디오 편집
            </Link>
          </div>
        </section>
      ) : (
        // H3: 프로필 미보유 크리에이터 첫 화면 가이드.
        // 스튜디오 섹션이 통째로 사라져 길을 잃지 않도록 시작 액션을 안내한다.
        <section className="space-y-2 rounded-xl border border-dashed p-4">
          <h2 className="font-heading text-lg font-semibold">
            스튜디오를 시작해 볼까요?
          </h2>
          <p className="text-sm text-muted-foreground">
            아직 스튜디오 정보가 없습니다. 첫 포스트를 올리거나 프로그램을 만들어
            바로 시작할 수 있어요.
          </p>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/dashboard/creator/posts/new"
          className="rounded-lg border p-4 text-sm font-medium hover:bg-muted"
        >
          포스트 작성
        </Link>
        <Link
          href="/dashboard/creator/programs"
          className="rounded-lg border p-4 text-sm font-medium hover:bg-muted"
        >
          내 프로그램
        </Link>
        <Link
          href="/dashboard/creator/programs/new"
          className="rounded-lg border p-4 text-sm font-medium hover:bg-muted"
        >
          프로그램 만들기
        </Link>
        <Link
          href="/dashboard/creator/members"
          className="rounded-lg border p-4 text-sm font-medium hover:bg-muted"
        >
          멤버 관리
        </Link>
      </section>
    </div>
  );
}
