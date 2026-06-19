import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listCreators } from "@/lib/queries/studio";
import { listPublicPrograms } from "@/lib/queries/programs";
import { buttonVariants } from "@/components/ui/button";
import { CreatorCard } from "@/components/creators/CreatorCard";
import { ProgramCard } from "@/components/programs/ProgramCard";

/**
 * 공개 랜딩 페이지.
 * 로그인 여부에 따라 CTA 를 노출한다.
 * 미로그인 → 가치 제안 + 역할별 시작 CTA + 인기 작가/프로그램 미리보기.
 * 로그인 → 역할별 홈 (CREATOR → /dashboard/creator, FAN → /dashboard/fan).
 */
export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    const homeHref =
      user.role === "CREATOR" ? "/dashboard/creator" : "/dashboard/fan";
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-4xl font-bold tracking-tight">ArtBridge</h1>
        <p className="max-w-md text-center text-muted-foreground">
          다시 돌아오셨네요. 이어서 계속해 볼까요?
        </p>
        <Link href={homeHref} className={buttonVariants({ size: "lg" })}>
          내 페이지로 이동
        </Link>
      </main>
    );
  }

  const [creators, programs] = await Promise.all([
    listCreators(),
    listPublicPrograms(),
  ]);
  const featuredCreators = creators.slice(0, 3);
  const featuredPrograms = programs.slice(0, 3);

  return (
    <main className="mx-auto max-w-5xl space-y-16 px-4 py-16">
      {/* 히어로 */}
      <section className="space-y-6 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">ArtBridge</h1>
          <p className="mx-auto max-w-xl text-balance text-muted-foreground">
            신진 작가는 작품·멤버십·프로그램으로 수익을 만들고, 팬은 좋아하는
            작가를 후원하고 클래스와 클럽에 참여하는 양면형 거래 플랫폼.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className={buttonVariants({ size: "lg" })}>
            시작하기
          </Link>
          <Link
            href="/creators"
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            작가 둘러보기
          </Link>
        </div>
        <p className="text-xs text-gray-500">데모 체험 중 — 일부 기능은 제한될 수 있습니다</p>
      </section>

      {/* 인기 작가 미리보기 */}
      {featuredCreators.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold">신진 작가</h2>
            <Link
              href="/creators"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              전체 보기 →
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {featuredCreators.map((creator) => (
              <li key={creator.id}>
                <CreatorCard creator={creator} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 인기 프로그램 미리보기 */}
      {featuredPrograms.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold">진행 중인 프로그램</h2>
            <Link
              href="/programs"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              전체 보기 →
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {featuredPrograms.map((program) => (
              <li key={program.id}>
                <ProgramCard program={program} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
