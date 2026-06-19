import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "@prisma/client";

// --- Mock prisma ---
const mockUpdate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    creatorProfile: { update: (...args: unknown[]) => mockUpdate(...args) },
  },
}));

// getCurrentUser is async and reads cookies; stub via module mock.
const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args[0] ? args : []),
}));

import { PATCH } from "@/app/api/studio/route";

const CREATOR_ROLE = "CREATOR" as Role;

const baseBody = {
  creatorProfileId: "p-1",
  studioName: "새 스튜디오 이름",
};

beforeEach(() => {
  mockUpdate.mockReset();
  mockGetCurrentUser.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("PATCH /api/studio — authorization (NFR-002, AC-006)", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const req = new Request("http://localhost/api/studio", {
      method: "PATCH",
      body: JSON.stringify(baseBody),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when body is not valid JSON", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u-1",
      role: CREATOR_ROLE,
      creatorProfile: { id: "p-1" },
    });
    const req = new Request("http://localhost/api/studio", {
      method: "PATCH",
      body: "not-json",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 when role is not CREATOR", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u-1",
      role: "FAN",
      creatorProfile: null,
    });
    const req = new Request("http://localhost/api/studio", {
      method: "PATCH",
      body: JSON.stringify(baseBody),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 403 when creatorProfileId does not match owner (AC-006 CORE)", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u-1",
      role: CREATOR_ROLE,
      creatorProfile: { id: "p-owned" },
    });
    const req = new Request("http://localhost/api/studio", {
      method: "PATCH",
      body: JSON.stringify({ ...baseBody, creatorProfileId: "p-other" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(403);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 when payload fails Zod validation", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u-1",
      role: CREATOR_ROLE,
      creatorProfile: { id: "p-1" },
    });
    const req = new Request("http://localhost/api/studio", {
      method: "PATCH",
      body: JSON.stringify({ creatorProfileId: "p-1", instagramUrl: "not-a-url" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 200 and updated profile when owner (AC-006 PASS)", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u-1",
      role: CREATOR_ROLE,
      creatorProfile: { id: "p-1" },
    });
    const updated = { id: "p-1", studioName: "새 스튜디오 이름" };
    mockUpdate.mockResolvedValue(updated);
    const req = new Request("http://localhost/api/studio", {
      method: "PATCH",
      body: JSON.stringify(baseBody),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const call = mockUpdate.mock.calls[0][0];
    expect(call.where).toEqual({ id: "p-1" });
    expect(call.data.studioName).toBe("새 스튜디오 이름");
    const body = await res.json();
    expect(body).toEqual(updated);
  });

  it("accepts empty string for URL fields (clears them)", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u-1",
      role: CREATOR_ROLE,
      creatorProfile: { id: "p-1" },
    });
    mockUpdate.mockResolvedValue({ id: "p-1" });
    const req = new Request("http://localhost/api/studio", {
      method: "PATCH",
      body: JSON.stringify({
        creatorProfileId: "p-1",
        instagramUrl: "",
        websiteUrl: "",
      }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    // 빈 문자열은 필드 제거(또는 undefined)로 처리되어야 함 — update.data에 빈 문자열이 들어가지 않아야 함
    const call = mockUpdate.mock.calls[0][0];
    expect(call.data.instagramUrl).not.toBe("");
    expect(call.data.websiteUrl).not.toBe("");
  });
});
