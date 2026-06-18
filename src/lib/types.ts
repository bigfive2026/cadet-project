import type { Role } from "@prisma/client";

/**
 * Lightweight creator-profile projection attached to the session user.
 * Kept decoupled from the Prisma model so the auth provider (Mock now,
 * Auth.js later) can be swapped without touching callers.
 */
export interface AppCreatorProfile {
  id: string;
  studioName: string;
  bio: string | null;
  // SPEC-002 T-001: 확장 필드 (null-safe)
  category?: string | null;
  coverImageUrl?: string | null;
  profileImageUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
}

/**
 * Session-level user shape (decoupled from Prisma model so the auth
 * provider — Mock now, Auth.js later — can be swapped without touching callers).
 */
export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Present when the user is a creator with a linked CreatorProfile (AC-004). */
  creatorProfile?: AppCreatorProfile | null;
}

export type { Role };
