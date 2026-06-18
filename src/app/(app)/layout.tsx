import { Header } from "@/components/Header";

/**
 * Layout for authenticated app routes (dashboard, creators, notifications, …).
 * Renders the global header with the current user, role badge, and logout
 * (SPEC-001 FR-006, FR-007). Protection from unauthenticated access is handled
 * by middleware (FR-005), so this layout assumes a session exists.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
    </div>
  );
}
