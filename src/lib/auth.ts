import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import type { AppUser, AppCreatorProfile, Role } from "@/lib/types";

/**
 * Server-side current user resolution (SPEC-001 FR-004).
 *
 * Reads the mock session cookie and loads the matching User (with
 * CreatorProfile). Returns null when there is no session or the session user
 * no longer exists (AC-004).
 *
 * Swap the underlying session source (`@/lib/session`) for Auth.js later —
 * the signature and `AppUser` return type stay stable, so callers do not
 * change (NFR-003).
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { creatorProfile: true },
  });
  if (!dbUser) return null;

  const creatorProfile: AppCreatorProfile | null = dbUser.creatorProfile
    ? {
        id: dbUser.creatorProfile.id,
        studioName: dbUser.creatorProfile.studioName,
        bio: dbUser.creatorProfile.bio,
        // SPEC-002 T-001: 5개 확장 필드 pass-through
        category: dbUser.creatorProfile.category,
        coverImageUrl: dbUser.creatorProfile.coverImageUrl,
        profileImageUrl: dbUser.creatorProfile.profileImageUrl,
        instagramUrl: dbUser.creatorProfile.instagramUrl,
        websiteUrl: dbUser.creatorProfile.websiteUrl,
      }
    : null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    creatorProfile,
  };
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized — no current user. Sign in via /login.");
  }
  return user;
}

export async function requireRole(role: Role): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== role) {
    throw new Error(`Forbidden — required role ${role}, got ${user.role}`);
  }
  return user;
}
