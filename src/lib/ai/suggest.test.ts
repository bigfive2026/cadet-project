import { afterEach, describe, expect, it, vi } from "vitest";
import {
  suggestMock,
  suggestProgram,
  suggestWithOpenAI,
  suggestionSchema,
} from "@/lib/ai/suggest";

const SAMPLE_INPUT = {
  description: "4주 드로잉 챌린지",
  duration: "4주",
  category: "드로잉",
  targetAudience: "초심자",
};

describe("suggestionSchema (FR-008, AC-008)", () => {
  it("accepts a well-formed suggestion", () => {
    const parsed = suggestionSchema.safeParse({
      suggestedPrice: 35000,
      benefits: ["1:1 첨삭"],
      programStructure: [{ week: 1, title: "기초", description: "선 긋기" }],
      reason: "초심자 맞춤",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects non-positive suggestedPrice", () => {
    const parsed = suggestionSchema.safeParse({
      suggestedPrice: 0,
      benefits: ["x"],
      programStructure: [{ week: 1, title: "t", description: "d" }],
      reason: "r",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects empty benefits array", () => {
    const parsed = suggestionSchema.safeParse({
      suggestedPrice: 10000,
      benefits: [],
      programStructure: [{ week: 1, title: "t", description: "d" }],
      reason: "r",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("suggestMock (FR-003, NFR-005, AC-003)", () => {
  it("returns a schema-valid suggestion", () => {
    const out = suggestMock(SAMPLE_INPUT);
    expect(suggestionSchema.safeParse(out).success).toBe(true);
  });

  it("is deterministic — same input yields identical output", () => {
    const a = suggestMock(SAMPLE_INPUT);
    const b = suggestMock(SAMPLE_INPUT);
    expect(a).toEqual(b);
  });

  it("produces different output for different input", () => {
    const a = suggestMock(SAMPLE_INPUT);
    const b = suggestMock({ ...SAMPLE_INPUT, description: "전혀 다른 프로그램" });
    expect(a).not.toEqual(b);
  });
});

describe("suggestWithOpenAI (FR-002, NFR-003)", () => {
  function mockFetchOk(body: unknown) {
    return vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;
  }

  it("parses a valid OpenAI structured response", async () => {
    const valid = {
      suggestedPrice: 42000,
      benefits: ["피드백", "커뮤니티"],
      programStructure: [
        { week: 1, title: "기초", description: "선 연습" },
        { week: 2, title: "응용", description: "명암" },
      ],
      reason: "초심자에게 적합",
    };
    const fetchMock = mockFetchOk({ choices: [{ message: { content: JSON.stringify(valid) } }] });
    const out = await suggestWithOpenAI(SAMPLE_INPUT, "sk-test", { fetchImpl: fetchMock });
    expect(out).toEqual(valid);
  });

  it("throws on timeout (AbortError)", async () => {
    const fetchMock = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        const ac = init?.signal as AbortSignal | undefined;
        ac?.addEventListener("abort", () => {
          const e = new Error("The operation was aborted");
          e.name = "AbortError";
          reject(e);
        });
      });
    }) as unknown as typeof fetch;
    await expect(
      suggestWithOpenAI(SAMPLE_INPUT, "sk-test", { fetchImpl: fetchMock, timeoutMs: 5 }),
    ).rejects.toThrow();
  });

  it("throws when response violates schema", async () => {
    const invalid = { suggestedPrice: -1, benefits: [], programStructure: [], reason: "" };
    const fetchMock = mockFetchOk({ choices: [{ message: { content: JSON.stringify(invalid) } }] });
    await expect(
      suggestWithOpenAI(SAMPLE_INPUT, "sk-test", { fetchImpl: fetchMock }),
    ).rejects.toThrow();
  });

  it("never leaks the API key into the request body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  suggestedPrice: 10000,
                  benefits: ["x"],
                  programStructure: [{ week: 1, title: "t", description: "d" }],
                  reason: "r",
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    await suggestWithOpenAI(SAMPLE_INPUT, "sk-secret-key", {
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const [, init] = fetchMock.mock.calls[0];
    const body = (init as RequestInit).body as string;
    expect(body).not.toContain("sk-secret-key");
    // Authorization header carries the key (server-side only, not in body).
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(JSON.stringify(headers)).toContain("sk-secret-key");
  });
});

describe("suggestProgram (FR-004, AC-004, AC-008)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses mock when no API key (source=mock)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const out = await suggestProgram(SAMPLE_INPUT);
    expect(out.source).toBe("mock");
    expect(suggestionSchema.safeParse(out).success).toBe(true);
  });

  it("falls back to mock when OpenAI call fails (source=mock)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const failingFetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    const out = await suggestProgram(SAMPLE_INPUT, { fetchImpl: failingFetch });
    expect(out.source).toBe("mock");
    expect(suggestionSchema.safeParse(out).success).toBe(true);
  });

  it("returns OpenAI result when call succeeds (source=openai)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const valid = {
      suggestedPrice: 50000,
      benefits: ["a", "b"],
      programStructure: [{ week: 1, title: "t", description: "d" }],
      reason: "ok",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(valid) } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ) as unknown as typeof fetch;
    const out = await suggestProgram(SAMPLE_INPUT, { fetchImpl: fetchMock });
    expect(out.source).toBe("openai");
    expect(out.suggestedPrice).toBe(50000);
  });
});
