import Link from "next/link";
import { Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { NotificationBell } from "@/components/notification/NotificationBell";
import { UserMenu } from "@/components/UserMenu";
import { Logo } from "@/components/Logo";
import { buttonVariants } from "@/components/ui/button";

const publicNavLinks = [
  { href: "/creators", label: "작가 찾기" },
  { href: "/creators?tab=artworks", label: "작품 보기" },
  { href: "/programs", label: "프로그램" },
  { href: "/support", label: "이용 안내" },
];

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

  // 비로그인 사용자용 공개 헤더 — 발견 중심 탐색 + 크리에이터 시작 CTA.
  if (!user) {
    return (
      <header className="sticky top-0 z-40 border-b border-border-default bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-5 px-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/"
              aria-label="ArtBridge 홈"
              className="shrink-0 text-brand-primary transition-colors hover:text-brand-primary-pressed"
            >
              <Logo className="h-[22px] w-auto" />
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {publicNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-brand-subtle hover:text-brand-primary-pressed"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "sm" })}>
              로그인
            </Link>
            <Link href="/signup" className={buttonVariants({ size: "sm" })}>
              크리에이터 시작
            </Link>
          </div>
        </div>
        <nav className="flex items-center gap-2 overflow-x-auto border-t border-border-default px-4 py-2 sm:hidden">
          {publicNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-[var(--radius-control)] px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-brand-subtle hover:text-brand-primary-pressed"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
    );
  }

  const navLinks =
    user.role === "CREATOR"
      ? [
          { href: "/", label: "홈" },
          {
            href: user.creatorProfile?.id
              ? `/creators/${user.creatorProfile.id}`
              : "/dashboard/creator/edit",
            label: "내 프로필",
          },
          { href: "/dashboard/creator", label: "관리 홈" },
          { href: "/dashboard/creator/artworks", label: "작품·작업" },
          { href: "/dashboard/creator/programs", label: "프로그램" },
          { href: "/dashboard/creator/artwork-orders", label: "주문·배송" },
          { href: "/dashboard/creator/settlements", label: "정산" },
        ]
      : [
          { href: "/dashboard/fan", label: "내 홈" },
          { href: "/creators", label: "둘러보기" },
          { href: "/programs", label: "프로그램" },
          { href: "/dashboard/fan/bookmarks", label: "관심 작가" },
          { href: "/dashboard/fan/memberships", label: "내 멤버십" },
          { href: "/dashboard/fan/payments", label: "내 신청·결제" },
        ];

  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-5 px-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/"
            aria-label="ArtBridge 홈"
            className="shrink-0 text-brand-primary transition-colors hover:text-brand-primary-pressed"
          >
            <Logo className="h-[22px] w-auto" />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-brand-subtle hover:text-brand-primary-pressed"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/creators"
            aria-label="검색"
            className="flex size-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-brand-subtle hover:text-brand-primary"
          >
            <Search className="size-5" />
          </Link>
          <NotificationBell />
          <UserMenu name={user.name} role={user.role} creatorProfileId={user.creatorProfile?.id} />
        </div>
      </div>

      <nav className="flex items-center gap-2 overflow-x-auto border-t border-border-default px-4 py-2 sm:hidden">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="shrink-0 rounded-[var(--radius-control)] px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-brand-subtle hover:text-brand-primary-pressed"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
