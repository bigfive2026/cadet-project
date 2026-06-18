import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

/**
 * Global app header (SPEC-001 FR-006, FR-007).
 *
 * Server component — reads the current user from the session cookie and
 * renders the name, a role badge, and a logout form. Returns null when no
 * session is present (login page renders without a header).
 */
export async function Header() {
  const user = await getCurrentUser();
  if (!user) return null;

  const roleLabel = user.role === "CREATOR" ? "크리에이터" : "팬";
  const roleClass =
    user.role === "CREATOR"
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="font-heading text-sm font-semibold">ArtBridge</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{user.name}</span>
            <span
              className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${roleClass}`}
            >
              {roleLabel}
            </span>
          </div>
        </div>

        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            로그아웃
          </Button>
        </form>
      </div>
    </header>
  );
}
