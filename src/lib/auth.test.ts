import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUser } from "@/lib/types";

// --- Mock store for next/headers cookies() (Next 16: async) ---
type CookieJar = Record<string, string>;
let jar: CookieJar = {};

const cookieStore = {
  get(name: string) {
    return jar[name] ? { name, value: jar[name] } : undefined;
  },
  set(name: string, value: string) {
    jar[name] = value;
  },
  delete(name: string) {
    delete jar[name];
  },
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

// --- Mock prisma ---
const mockUserFindUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
  },
}));

import { getCurrentUser, requireUser, requireRole } from "@/lib/auth";
import { clearSession, getSessionUserId, setSessionCookie, SESSION_COOKIE } from "@/lib/session";

const dbCreator = {
  id: "u-creator",
  email: "creator@artbridge.demo",
  name: "데모 크리에이터",
  role: "CREATOR",
  creatorProfile: {
    id: "p-1",
    studioName: "신진작가 스튜디오",
    bio: "bio",
    category: "회화",
    coverImageUrl: "https://example.com/cover.jpg",
    profileImageUrl: "https://example.com/profile.jpg",
    instagramUrl: "https://instagram.com/foo",
    websiteUrl: "https://example.com",
  },
};

function asAppUser(u: typeof dbCreator): AppUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as AppUser["role"],
    creatorProfile: u.creatorProfile,
  };
}

beforeEach(() => {
  jar = {};
  mockUserFindUnique.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("session cookie helpers", () => {
  it("setSessionCookie writes the userId under the session cookie name", async () => {
    await setSessionCookie("u-123");
    expect(jar[SESSION_COOKIE]).toBe("u-123");
  });

  it("getSessionUserId returns null when no cookie is present", async () => {
    await expect(getSessionUserId()).resolves.toBeNull();
  });

  it("getSessionUserId returns the stored userId", async () => {
    await setSessionCookie("u-123");
    await expect(getSessionUserId()).resolves.toBe("u-123");
  });

  it("clearSession removes the cookie", async () => {
    await setSessionCookie("u-123");
    await clearSession();
    expect(jar[SESSION_COOKIE]).toBeUndefined();
  });
});

describe("getCurrentUser", () => {
  it("returns null when there is no session cookie", async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("returns null when the session user is not found in the DB", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    await setSessionCookie("ghost");
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns the user with creatorProfile included (AC-004)", async () => {
    mockUserFindUnique.mockResolvedValue(dbCreator);
    await setSessionCookie(dbCreator.id);
    const user = await getCurrentUser();
    expect(user).toEqual(asAppUser(dbCreator));
    expect(user?.creatorProfile?.studioName).toBe("신진작가 스튜디오");
  });

  it("queries by id and includes creatorProfile", async () => {
    mockUserFindUnique.mockResolvedValue(dbCreator);
    await setSessionCookie(dbCreator.id);
    await getCurrentUser();
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: dbCreator.id },
      include: { creatorProfile: true },
    });
  });

  it("propagates the 5 extended profile fields (T-001/SPEC-002)", async () => {
    mockUserFindUnique.mockResolvedValue(dbCreator);
    await setSessionCookie(dbCreator.id);
    const user = await getCurrentUser();
    const profile = user?.creatorProfile;
    expect(profile?.category).toBe("회화");
    expect(profile?.coverImageUrl).toBe("https://example.com/cover.jpg");
    expect(profile?.profileImageUrl).toBe("https://example.com/profile.jpg");
    expect(profile?.instagramUrl).toBe("https://instagram.com/foo");
    expect(profile?.websiteUrl).toBe("https://example.com");
  });
});

describe("requireUser", () => {
  it("throws when unauthenticated", async () => {
    await expect(requireUser()).rejects.toThrow();
  });

  it("returns the user when authenticated", async () => {
    mockUserFindUnique.mockResolvedValue(dbCreator);
    await setSessionCookie(dbCreator.id);
    await expect(requireUser()).resolves.toEqual(asAppUser(dbCreator));
  });
});

describe("requireRole", () => {
  it("throws when role does not match", async () => {
    const fan = { ...dbCreator, id: "u-fan", role: "FAN", creatorProfile: null };
    mockUserFindUnique.mockResolvedValue(fan);
    await setSessionCookie(fan.id);
    await expect(requireRole("CREATOR" as never)).rejects.toThrow();
  });

  it("returns the user when role matches", async () => {
    mockUserFindUnique.mockResolvedValue(dbCreator);
    await setSessionCookie(dbCreator.id);
    await expect(requireRole("CREATOR" as never)).resolves.toEqual(asAppUser(dbCreator));
  });
});
