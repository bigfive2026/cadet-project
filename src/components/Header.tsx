import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification/NotificationBell";

/**
 * Global app header (SPEC-001 FR-006, FR-007).
 *
 * Server component — reads the current user from the session cookie and
 * renders the logo link, a role-aware global navigation, the name, a role
 * badge, the notification bell, and a logout form. Returns null when no
 * session is present (login page renders without a header).
 * SPEC-005: 알림 벨 추가.
 */
export async function Header() {
  const user = await getCurrentUser();
  if (!user) return null;

  const roleLabel = user.role === "CREATOR" ? "크리에이터" : "팬";
  const roleClass =
    user.role === "CREATOR"
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground";

  const navLinks =
    user.role === "CREATOR"
      ? [
          { href: "/creators", label: "둘러보기" },
          { href: "/dashboard/creator", label: "스튜디오" },
          { href: "/dashboard/creator/programs", label: "프로그램" },
          { href: "/dashboard/creator/posts/new", label: "포스트 작성" },
        ]
      : [
          { href: "/creators", label: "둘러보기" },
          { href: "/programs", label: "프로그램" },
          { href: "/dashboard/fan/bookmarks", label: "관심 작가" },
          { href: "/dashboard/fan/memberships", label: "내 멤버십" },
        ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/"
            className="shrink-0 font-heading text-sm font-semibold hover:opacity-80"
          >
            ArtBridge
          </Link>
          <nav className="hidden items-center gap-3 sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <span className="text-sm font-medium">{user.name}</span>
            <span
              className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${roleClass}`}
            >
              {roleLabel}
            </span>
          </div>
          <NotificationBell />
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              로그아웃
            </Button>
          </form>
        </div>
      </div>

      {/* 모바일 네비게이션 (작은 화면에서 상단 네비가 숨겨지므로 별도 행) */}
      <nav className="flex items-center gap-4 overflow-x-auto border-t px-4 py-2 sm:hidden">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
