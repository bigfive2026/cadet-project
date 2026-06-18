import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.hoisted ensures mocks exist before vi.mock factories run (hoisting).
const { mockRedirect, mockSetSession, mockClearSession, mockFindMany } = vi.hoisted(() => ({
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  mockSetSession: vi.fn(async () => {}),
  mockClearSession: vi.fn(async () => {}),
  mockFindMany: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mockRedirect }));
vi.mock("@/lib/session", () => ({
  setSessionCookie: mockSetSession,
  clearSession: mockClearSession,
  SESSION_COOKIE: "ab_session",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: (...args: unknown[]) => mockFindMany(...args) },
  },
}));

import { loginAs, logout } from "@/app/login/actions";
import type { Role } from "@prisma/client";

const creatorSeed = [
  {
    id: "u-creator",
    email: "creator@artbridge.demo",
    name: "데모 크리에이터",
    role: "CREATOR" as Role,
    creatorProfile: { id: "p-1", studioName: "스튜디오", bio: null },
  },
  {
    id: "u-creator2",
    email: "creator2@artbridge.demo",
    name: "데모 크리에이터 2",
    role: "CREATOR" as Role,
    creatorProfile: { id: "p-2", studioName: "스튜디오 2", bio: null },
  },
];
const fanSeed = [
  { id: "u-fan1", email: "fan1@artbridge.demo", name: "데모 팬 1", role: "FAN" as Role, creatorProfile: null },
  { id: "u-fan2", email: "fan2@artbridge.demo", name: "데모 팬 2", role: "FAN" as Role, creatorProfile: null },
];

beforeEach(() => {
  mockRedirect.mockClear();
  mockSetSession.mockReset();
  mockClearSession.mockReset();
  mockFindMany.mockReset();
});

afterEach(() => vi.clearAllMocks());

describe("loginAs", () => {
  it("logs in the first seeded creator and redirects to /dashboard/creator (FR-002)", async () => {
    mockFindMany.mockResolvedValue(creatorSeed);
    await expect(loginAs("CREATOR")).rejects.toThrow("REDIRECT:/dashboard/creator");
    expect(mockSetSession).toHaveBeenCalledWith(creatorSeed[0].id);
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/creator");
  });

  it("logs in the first seeded fan and redirects to /creators (FR-003)", async () => {
    mockFindMany.mockResolvedValue(fanSeed);
    await expect(loginAs("FAN")).rejects.toThrow("REDIRECT:/creators");
    expect(mockSetSession).toHaveBeenCalledWith(fanSeed[0].id);
    expect(mockRedirect).toHaveBeenCalledWith("/creators");
  });

  it("selects a specific seed user by index", async () => {
    mockFindMany.mockResolvedValue(creatorSeed);
    await expect(loginAs("CREATOR", 1)).rejects.toThrow("REDIRECT:/dashboard/creator");
    expect(mockSetSession).toHaveBeenCalledWith(creatorSeed[1].id);
  });

  it("only selects creators that actually have a CreatorProfile (FR-009)", async () => {
    mockFindMany.mockResolvedValue(creatorSeed);
    await expect(loginAs("CREATOR")).rejects.toThrow();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: "CREATOR" }),
      }),
    );
  });

  it("throws when no matching seed user exists", async () => {
    mockFindMany.mockResolvedValue([]);
    await expect(loginAs("CREATOR")).rejects.toThrow(/no seeded/i);
    expect(mockSetSession).not.toHaveBeenCalled();
  });
});

describe("logout", () => {
  it("clears the session and redirects to /login (FR-007)", async () => {
    await expect(logout()).rejects.toThrow("REDIRECT:/login");
    expect(mockClearSession).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });
});

describe("loginAsCreator / loginAsFan wrappers (FR-001)", () => {
  it("loginAsCreator delegates to loginAs with CREATOR", async () => {
    const { loginAsCreator } = await import("@/app/login/actions");
    mockFindMany.mockResolvedValue(creatorSeed);
    await expect(loginAsCreator()).rejects.toThrow("REDIRECT:/dashboard/creator");
  });

  it("loginAsFan delegates to loginAs with FAN", async () => {
    const { loginAsFan } = await import("@/app/login/actions");
    mockFindMany.mockResolvedValue(fanSeed);
    await expect(loginAsFan()).rejects.toThrow("REDIRECT:/creators");
  });
});
