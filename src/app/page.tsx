import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

/**
 * 공개 랜딩 페이지.
 * 로그인 여부에 따라 시작 CTA 를 노출한다.
 * 미로그인 → /login, 로그인 → 역할별 홈(CREATOR: /dashboard/creator, FAN: /creators).
 */
export default async function Home() {
  const user = await getCurrentUser();
  const homeHref = user?.role === "CREATOR" ? "/dashboard/creator" : "/creators";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">ArtBridge</h1>
      <p className="max-w-md text-center text-muted-foreground">
        신진작가와 팬을 잇는 양면형 거래 플랫폼.
        스튜디오 · 멤버십 · 유료 포스트 · 프로그램 · 커뮤니티.
      </p>

      <Link
        href={user ? homeHref : "/login"}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {user ? "내 페이지로 이동" : "시작하기"}
      </Link>

      <p className="text-sm text-gray-500">데모 랜딩 — 구현 진행 중</p>
    </main>
  );
}
