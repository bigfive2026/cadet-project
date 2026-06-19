import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUser } from "@/lib/types";

// --- Mock @/auth (Auth.js auth() 세션) ---
// getCurrentUser 는 auth() 세션에서 user.id 를 읽는다.
const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

// --- Mock next/navigation redirect ---
// requireUser/requireRole 는 역할 불일치/미인증 시 redirect() 를 호출한다.
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT ${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

// --- Mock prisma ---
const mockUserFindUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
  },
}));

import { getCurrentUser, requireUser, requireRole } from "@/lib/auth";

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

function sessionFor(userId: string | null) {
  return userId ? { user: { id: userId } } : null;
}

beforeEach(() => {
  mockUserFindUnique.mockReset();
  mockRedirect.mockReset();
  mockRedirect.mockImplementation((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  });
  mockAuth.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentUser (SPEC-AUTH)", () => {
  it("returns null when there is no session", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("returns null when the session user is not found in the DB", async () => {
    mockAuth.mockResolvedValue(sessionFor("ghost"));
    mockUserFindUnique.mockResolvedValue(null);
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns the user with creatorProfile included (AC-004)", async () => {
    mockAuth.mockResolvedValue(sessionFor(dbCreator.id));
    mockUserFindUnique.mockResolvedValue(dbCreator);
    const user = await getCurrentUser();
    expect(user).toEqual(asAppUser(dbCreator));
    expect(user?.creatorProfile?.studioName).toBe("신진작가 스튜디오");
  });

  it("queries by session user id and includes creatorProfile", async () => {
    mockAuth.mockResolvedValue(sessionFor(dbCreator.id));
    mockUserFindUnique.mockResolvedValue(dbCreator);
    await getCurrentUser();
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: dbCreator.id },
      include: { creatorProfile: true },
    });
  });

  it("propagates the 5 extended profile fields (T-001/SPEC-002)", async () => {
    mockAuth.mockResolvedValue(sessionFor(dbCreator.id));
    mockUserFindUnique.mockResolvedValue(dbCreator);
    const user = await getCurrentUser();
    const profile = user?.creatorProfile;
    expect(profile?.category).toBe("회화");
    expect(profile?.coverImageUrl).toBe("https://example.com/cover.jpg");
    expect(profile?.profileImageUrl).toBe("https://example.com/profile.jpg");
    expect(profile?.instagramUrl).toBe("https://instagram.com/foo");
    expect(profile?.websiteUrl).toBe("https://example.com");
  });
});

describe("requireUser (SPEC-AUTH)", () => {
  it("redirects to /login when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow();
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("returns the user when authenticated", async () => {
    mockAuth.mockResolvedValue(sessionFor(dbCreator.id));
    mockUserFindUnique.mockResolvedValue(dbCreator);
    await expect(requireUser()).resolves.toEqual(asAppUser(dbCreator));
  });
});

describe("requireRole (SPEC-AUTH)", () => {
  it("redirects when role does not match (FAN accessing CREATOR route)", async () => {
    const fan = { ...dbCreator, id: "u-fan", role: "FAN", creatorProfile: null };
    mockAuth.mockResolvedValue(sessionFor(fan.id));
    mockUserFindUnique.mockResolvedValue(fan);
    await expect(requireRole("CREATOR" as never)).rejects.toThrow();
    // CREATOR 전용 페이지에 FAN 이 접근하면 팬 홈(/creators) 로 보낸다.
    expect(mockRedirect).toHaveBeenCalledWith("/creators");
  });

  it("returns the user when role matches", async () => {
    mockAuth.mockResolvedValue(sessionFor(dbCreator.id));
    mockUserFindUnique.mockResolvedValue(dbCreator);
    await expect(requireRole("CREATOR" as never)).resolves.toEqual(asAppUser(dbCreator));
  });
});
