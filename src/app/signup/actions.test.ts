import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRedirect, mockSignIn, mockHash, mockFindUnique, mockCreate } = vi.hoisted(() => ({
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  mockSignIn: vi.fn(),
  mockHash: vi.fn(async (...args: unknown[]) => `hash(${args[0]})`),
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mockRedirect }));
// next-auth 의 AuthError 를 실제 모듈 평가 없이 사용 (Next16 + next-auth beta 의 next/server 해석 회피).
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
}));
vi.mock("@/auth", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));
vi.mock("@/lib/password", () => ({
  hashPassword: (...args: unknown[]) => mockHash(...args),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

import { register } from "@/app/signup/actions";

function formData(obj: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  mockRedirect.mockClear();
  mockSignIn.mockReset();
  mockHash.mockReset();
  mockFindUnique.mockReset();
  mockCreate.mockReset();
  mockSignIn.mockResolvedValue(undefined);
  mockHash.mockResolvedValue("hash(stub)");
});

afterEach(() => vi.clearAllMocks());

describe("register (SPEC-AUTH)", () => {
  it("creates a CREATOR and redirects to /", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "u-new" });
    await expect(
      register(
        undefined,
        formData({ name: "새 작가", email: "new@artbridge.demo", password: "password123", role: "CREATOR" }),
      ),
    ).rejects.toThrow("REDIRECT:/");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "new@artbridge.demo",
          role: "CREATOR",
          passwordHash: "hash(stub)",
        }),
      }),
    );
    expect(mockSignIn).toHaveBeenCalledWith("credentials", expect.objectContaining({ email: "new@artbridge.demo" }));
  });

  it("creates a FAN and redirects to /", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: "u-fan" });
    await expect(
      register(
        undefined,
        formData({ name: "새 팬", email: "fan@artbridge.demo", password: "password123", role: "FAN" }),
      ),
    ).rejects.toThrow("REDIRECT:/");
  });

  it("returns a field error when the email is already taken", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing" });
    const result = await register(
      undefined,
      formData({ name: "x", email: "dup@artbridge.demo", password: "password123", role: "FAN" }),
    );
    expect(result?.fieldErrors?.email).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns field errors on invalid input (short password)", async () => {
    const result = await register(
      undefined,
      formData({ name: "x", email: "bad", password: "123", role: "FAN" }),
    );
    expect(result?.fieldErrors).toBeTruthy();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
