import Link from "next/link";
import { listCreators } from "@/lib/queries/studio";
import { listPublicPrograms } from "@/lib/queries/programs";
import { buttonVariants } from "@/components/ui/button";
import { CreatorCard } from "@/components/creators/CreatorCard";
import { ProgramCard } from "@/components/programs/ProgramCard";
import { LoginBanner } from "@/components/home/LoginBanner";

/**
 * 공개 랜딩 페이지.
 * ISR(revalidate 60s)로 캐싱하여 DB 쿼리 비용을 줄인다.
 * 로그인 여부에 따른 개인화 UI(환영 배너)는 클라이언트 LoginBanner 로 분리.
 */
export const revalidate = 60;

export default async function Home() {
  const [creators, programs] = await Promise.all([
    listCreators(),
    listPublicPrograms(),
  ]);
  const featuredCreators = creators.slice(0, 3);
  const featuredPrograms = programs.slice(0, 3);

  return (
    <main className="mx-auto max-w-5xl space-y-16 px-4 py-16">
      {/* 로그인 상태 배너 (클라이언트) */}
      <LoginBanner />

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
