import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listMyBookmarks } from "@/lib/bookmarks";
import { CreatorCard } from "@/components/creators/CreatorCard";
import { buttonVariants } from "@/components/ui/button";

/**
 * 팬 관심 작가(북마크) 페이지 (PRD §13.2).
 * 인증된 팬만 접근 가능 — 본인이 북마크한 크리에이터 목록을 표시한다.
 */
export default async function MyBookmarksPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const bookmarks = await listMyBookmarks(user.id);

  return (
    <main className="mx-auto max-w-3xl space-y-6 py-8">
      <header className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">관심 작가</h1>
        <p className="text-sm text-muted-foreground">
          북마크한 작가 목록입니다.
        </p>
      </header>

      {bookmarks.length === 0 ? (
        <div className="space-y-4 rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            아직 관심 작가가 없습니다. 마음에 드는 작가를 찾아보세요.
          </p>
          <Link
            href="/creators"
            className={buttonVariants({ variant: "outline" })}
          >
            작가 둘러보기
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {bookmarks.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>
      )}
    </main>
  );
}
