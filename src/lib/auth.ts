import { redirect } from "next/navigation";
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
    // 미인증 사용자는 로그인으로 보낸다. throw 대신 redirect하여
    // 역할 불일치/미인증 시 500 대신 안전한 페이지로 유도 (UX 회귀 수정).
    redirect("/login");
  }
  return user;
}

export async function requireRole(role: Role): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== role) {
    // 역할이 맞지 않으면 해당 역할의 홈으로 보낸다.
    // CREATOR 전용 페이지에 FAN이 접근하면 팬 홈(/creators)로,
    // FAN 전용 페이지에 CREATOR가 접근하면 스튜디오(/dashboard/creator)로.
    redirect(role === "CREATOR" ? "/creators" : "/dashboard/creator");
  }
  return user;
}
