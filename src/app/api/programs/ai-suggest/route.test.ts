import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const mockSuggestProgram = vi.fn();
vi.mock("@/lib/ai/suggest", () => ({
  suggestProgram: (...a: unknown[]) => mockSuggestProgram(...a),
}));

import { getCurrentUser } from "@/lib/auth";
import { POST } from "@/app/api/programs/ai-suggest/route";

const CREATOR = {
  id: "u-1",
  email: "c@artbridge.demo",
  name: "C",
  role: "CREATOR" as const,
  creatorProfile: null,
};
const FAN = {
  id: "u-2",
  email: "f@artbridge.demo",
  name: "F",
  role: "FAN" as const,
  creatorProfile: null,
};

const SAMPLE_BODY = {
  description: "4주 드로잉 챌린지",
  duration: "4주",
  category: "드로잉",
  targetAudience: "초심자",
};

const VALID_SUGGESTION = {
  suggestedPrice: 35000,
  benefits: ["피드백"],
  programStructure: [{ week: 1, title: "기초", description: "선 긋기" }],
  reason: "초심자 맞춤",
  source: "mock" as const,
};

function jsonReq(body: unknown) {
  return new Request("http://localhost/api/programs/ai-suggest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/programs/ai-suggest (SPEC-010)", () => {
  it("returns 401 when not logged in", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const res = await POST(jsonReq(SAMPLE_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-creator (FAN) — FR-007, AC-005", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(FAN);
    const res = await POST(jsonReq(SAMPLE_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 200 with schema-valid JSON for creator — AC-001", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(CREATOR);
    mockSuggestProgram.mockResolvedValue(VALID_SUGGESTION);
    const res = await POST(jsonReq(SAMPLE_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestedPrice).toBeGreaterThan(0);
    expect(body.benefits.length).toBeGreaterThanOrEqual(1);
    expect(body.programStructure.length).toBeGreaterThanOrEqual(1);
    expect(typeof body.reason).toBe("string");
  });

  it("includes source so the card can show fallback notice — AC-004", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(CREATOR);
    mockSuggestProgram.mockResolvedValue({ ...VALID_SUGGESTION, source: "mock" });
    const res = await POST(jsonReq(SAMPLE_BODY));
    const body = await res.json();
    expect(body.source).toBe("mock");
  });

  it("returns 400 on invalid input (missing description)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(CREATOR);
    const res = await POST(jsonReq({ description: "" }));
    expect(res.status).toBe(400);
  });

  it("never echoes the API key in the response — AC-006", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(CREATOR);
    mockSuggestProgram.mockResolvedValue(VALID_SUGGESTION);
    const res = await POST(jsonReq(SAMPLE_BODY));
    const text = await res.text();
    expect(text).not.toMatch(/sk-/i);
  });
});
