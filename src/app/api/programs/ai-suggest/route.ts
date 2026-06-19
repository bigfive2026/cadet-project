import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { suggestProgram } from "@/lib/ai/suggest";

/**
 * POST /api/programs/ai-suggest — AI 가격·혜택·구성 추천 (SPEC-010 FR-001, FR-007).
 *
 * 권한 흐름: 비로그인 401 → 비크리에이터 403 → 입력검증 400 → 추천 200.
 * 결과는 항상 suggestionSchema 를 만족하며, source(openai|mock)를 포함한다.
 * 클라이언트는 source==="mock" 일 때 폴백 안내(AC-004)를 표시한다.
 *
 * @MX:ANCHOR: [AUTO] AI 추천 API — 크리에이터 전용 공개 API 경계
 * @MX:REASON: 권한 검증 + 키 노출 금지가 보안 경계 (FR-006, FR-007, AC-006)
 */
const aiSuggestInputSchema = z.object({
  description: z.string().min(1),
  duration: z.string().optional(),
  category: z.string().optional(),
  targetAudience: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "CREATOR") {
    return NextResponse.json({ error: "Forbidden — creator only" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = aiSuggestInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // suggestProgram 은 예외를 던지지 않고 항상 결과(Mock 폴백 포함)를 반환한다(NFR-001).
  // 방어적으로 try/catch 하되, 에러 메시지에는 키/내부 정보를 절대 노출하지 않는다(AC-006).
  try {
    const result = await suggestProgram(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 200 },
    );
  }
}
