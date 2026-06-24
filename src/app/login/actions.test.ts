import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthError } from "next-auth";

// vi.hoisted ensures mocks exist before vi.mock factories run (hoisting).
const { mockRedirect, mockSignIn, mockSignOut } = vi.hoisted(() => ({
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  mockSignIn: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mockRedirect }));
// next-auth 의 AuthError 를 실제 모듈 평가 없이 사용 (Next16 + next-auth beta 의 next/server 해석 회피).
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
}));
vi.mock("@/auth", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));
import { loginWithCredentials, logout } from "@/app/login/actions";

function formData(obj: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(obj)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  mockRedirect.mockClear();
  mockSignIn.mockReset();
  mockSignOut.mockReset();
});

afterEach(() => vi.clearAllMocks());

describe("loginWithCredentials (SPEC-AUTH)", () => {
  it("redirects to / on successful creator login", async () => {
    mockSignIn.mockResolvedValue(undefined);
    await expect(
      loginWithCredentials(undefined, formData({ email: "creator@artbridge.demo", password: "demo1234!" })),
    ).rejects.toThrow("REDIRECT:/");
    expect(mockSignIn).toHaveBeenCalledWith("credentials", expect.objectContaining({ email: "creator@artbridge.demo" }));
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("redirects to / on successful fan login", async () => {
    mockSignIn.mockResolvedValue(undefined);
    await expect(
      loginWithCredentials(undefined, formData({ email: "fan1@artbridge.demo", password: "demo1234!" })),
    ).rejects.toThrow("REDIRECT:/");
  });

  it("returns inline error on invalid credentials (no redirect)", async () => {
    mockSignIn.mockRejectedValue(new AuthError("invalid"));
    const result = await loginWithCredentials(
      undefined,
      formData({ email: "x@y.z", password: "wrong" }),
    );
    expect(result).toEqual({ error: expect.any(String) });
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("honors callbackUrl over role home", async () => {
    mockSignIn.mockResolvedValue(undefined);
    await expect(
      loginWithCredentials(
        undefined,
        formData({ email: "fan1@artbridge.demo", password: "demo1234!", callbackUrl: "/notifications" }),
      ),
    ).rejects.toThrow("REDIRECT:/notifications");
  });
});

describe("logout (SPEC-AUTH)", () => {
  it("signs out and redirects to /login", async () => {
    mockSignOut.mockImplementation(() => {
      throw new Error("REDIRECT:/login");
    });
    await expect(logout()).rejects.toThrow("REDIRECT:/login");
    expect(mockSignOut).toHaveBeenCalledWith(expect.objectContaining({ redirectTo: "/login" }));
  });
});
