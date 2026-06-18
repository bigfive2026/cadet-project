import { cookies } from "next/headers";

/**
 * Mock session storage (SPEC-001 FR-008).
 *
 * The session is a single HTTP-only cookie holding the seeded `User.id`.
 * Encapsulated here so the future Auth.js migration only touches this module —
 * `getCurrentUser()` and its callers stay unchanged (NFR-003).
 */
export const SESSION_COOKIE = "ab_session";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
};

/** Persist the given userId as the current session. */
export async function setSessionCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, COOKIE_OPTIONS);
}

/** Read the current session userId, or null when no session is present. */
export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** Clear the current session. */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
