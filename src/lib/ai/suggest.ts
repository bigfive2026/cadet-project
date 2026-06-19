import { z } from "zod";

/**
 * AI 가격·혜택·프로그램 구성 추천 (SPEC-010).
 *
 * 두 경로를 가진다:
 *  1) suggestWithOpenAI — OPENAI_API_KEY 가 있을 때 OpenAI JSON Schema 호출.
 *  2) suggestMock — 키가 없거나 OpenAI 호출이 실패/스키마 위반일 때의 결정론적 폴백.
 *
 * suggestProgram 이 분기를 판단하며, 어떤 경로든 결과는 suggestionSchema 로 검증된다.
 * 데모 안정성(NFR-001)과 키 노출 금지(NFR-002)가 최우선이다.
 */

// @MX:ANCHOR: [AUTO] 추천 응답 스키마 — 클라이언트·서버 공동 검증 경계 (FR-008, NFR-004)
// @MX:REASON: OpenAI·Mock 양 경로 결과가 반드시 만족해야 하는 계약
export const programStructureItemSchema = z.object({
  week: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().min(1),
});

export const suggestionSchema = z.object({
  suggestedPrice: z.number().int().positive(),
  benefits: z.array(z.string().min(1)).min(1),
  programStructure: z.array(programStructureItemSchema).min(1),
  reason: z.string().min(1),
});

export type ProgramStructureItem = z.infer<typeof programStructureItemSchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;

export interface SuggestInput {
  description: string;
  duration?: string;
  category?: string;
  targetAudience?: string;
}

/**
 * 클라이언트가 폴백 안내(AC-004)를 표시할 수 있도록 결과에 출처를 표시한다.
 * source === "mock" 이면 "AI 일시적 오류로 기본 추천을 표시합니다" 안내 대상.
 */
export interface SuggestResult extends Suggestion {
  source: "openai" | "mock";
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * 입력을 정규화해 결정론적 시드를 만든다(NFR-005).
 * 동일 입력 → 동일 시드 → 동일 추천(AC-003).
 */
function seedOf(input: SuggestInput): number {
  const raw = [input.description, input.duration, input.category, input.targetAudience]
    .map((v) => (v ?? "").trim().toLowerCase())
    .join("|");
  // djb2 variant
  let h = 5381;
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) + h + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** "4주", "8 주" 같은 표현에서 주차 수를 파싱한다. 실패 시 기본 4주. */
function parseWeeks(duration?: string): number {
  if (!duration) return 4;
  const m = duration.match(/(\d+)\s*주/);
  const n = m ? Number(m[1]) : NaN;
  if (!Number.isFinite(n) || n < 1) return 4;
  return Math.min(n, 12);
}

/**
 * 결정론적 Mock 추천(FR-003, NFR-005, AC-003).
 * 동일 입력에 항상 동일 JSON 을 반환한다.
 */
export function suggestMock(input: SuggestInput): Suggestion {
  const seed = seedOf(input);
  const weeks = parseWeeks(input.duration);

  // 20,000 ~ 99,000 원, 1,000원 단위
  const price = 20000 + (seed % 80) * 1000;

  const allBenefits = [
    "주간 1:1 첨삭 피드백",
    "비공개 커뮤니티 참여",
    "완주자 한정 작품 전시 기회",
    "주차별 참고 자료 제공",
    "라이브 QnA 세션",
  ];
  // 시드 기반으로 2~3개 선택(결정적)
  const benefitCount = 2 + (seed % 2);
  const benefits = Array.from({ length: benefitCount }, (_, i) => allBenefits[(seed + i * 3) % allBenefits.length]);

  const audience = input.targetAudience?.trim() || "참여자";
  const category = input.category?.trim() || "프로그램";

  const programStructure: ProgramStructureItem[] = Array.from({ length: weeks }, (_, i) => {
    const w = i + 1;
    return {
      week: w,
      title: `${w}주차: ${category} 기초 ${w}`,
      description: `${audience}를 위한 ${category} 단계별 실습 — ${w}주차.`,
    };
  });

  return {
    suggestedPrice: price,
    benefits,
    programStructure,
    reason: `${audience}에게 적합한 ${weeks}주 ${category} 프로그램 구성입니다. 결정론적 데모 추천입니다.`,
  };
}

interface OpenAICallOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * OpenAI Chat Completions(JSON Schema response) 호출(FR-002, NFR-003).
 * 실패(타임아웃/네트워크/스키마 위반)시 예외를 던진다 — 호출자(suggestProgram)가 Mock 폴백을 결정한다.
 *
 * @MX:WARN: [AUTO] 외부 API 키 사용 — 본문에 키 평문 노출 금지, Authorization 헤더만 사용 (FR-006, AC-006)
 * @MX:REASON: 키 노출 방지가 핵심 보안 요구사항
 */
export async function suggestWithOpenAI(
  input: SuggestInput,
  apiKey: string,
  opts: OpenAICallOptions = {},
): Promise<Suggestion> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  const schema = {
    type: "object",
    properties: {
      suggestedPrice: { type: "integer", minimum: 1 },
      benefits: { type: "array", items: { type: "string" }, minItems: 1 },
      programStructure: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            week: { type: "integer", minimum: 1 },
            title: { type: "string" },
            description: { type: "string" },
          },
          required: ["week", "title", "description"],
          additionalProperties: false,
        },
      },
      reason: { type: "string" },
    },
    required: ["suggestedPrice", "benefits", "programStructure", "reason"],
    additionalProperties: false,
  };

  let response: Response;
  try {
    response = await fetchImpl("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: ac.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      // 본문에는 키를 절대 넣지 않는다(AC-006).
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "크리에이터의 프로그램 설명을 바탕으로 합리적인 가격·혜택·주차 구성을 JSON으로 추천하라.",
          },
          {
            role: "user",
            content: JSON.stringify({
              description: input.description,
              duration: input.duration,
              category: input.category,
              targetAudience: input.targetAudience,
            }),
          },
        ],
        response_format: { type: "json_schema", json_schema: { name: "program_suggestion", schema, strict: true } },
      }),
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned no content");
  }

  const parsed = suggestionSchema.safeParse(JSON.parse(content));
  if (!parsed.success) {
    throw new Error("OpenAI response failed schema validation");
  }
  return parsed.data;
}

/**
 * 추천 진입점(FR-001, FR-004).
 *  - 키 없음 → Mock(AC-003)
 *  - 키 있음 + OpenAI 성공 → OpenAI 결과
 *  - 키 있음 + OpenAI 실패/위반 → Mock 폴백(AC-004, AC-008)
 */
export async function suggestProgram(
  input: SuggestInput,
  opts: OpenAICallOptions & { openaiApiKey?: string } = {},
): Promise<SuggestResult> {
  const apiKey = opts.openaiApiKey ?? process.env.OPENAI_API_KEY;
  if (apiKey && apiKey.trim() !== "") {
    try {
      const suggestion = await suggestWithOpenAI(input, apiKey, opts);
      return { ...suggestion, source: "openai" };
    } catch {
      // 폴백 — 데모는 실패하지 않는다(NFR-001, FR-004).
    }
  }
  return { ...suggestMock(input), source: "mock" };
}
