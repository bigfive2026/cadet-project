"use client";

import { Button } from "@/components/ui/button";
import type { Suggestion } from "@/lib/ai/suggest";

/**
 * AI 추천 결과 카드 (SPEC-010 FR-005, AC-002, AC-004).
 * 가격·혜택·주차 구성·사유 표시. source==="mock" 이면 폴백 안내(AC-004).
 * "추천 반영" 은 부모의 폼 상태 갱신만 트리거(DB 저장 없음 — FR-005).
 */
export interface AiSuggestionCardProps {
  suggestion: Suggestion & { source: "openai" | "mock" };
  onApply: (suggestion: Suggestion) => void;
  onClose: () => void;
}

export function AiSuggestionCard({ suggestion, onApply, onClose }: AiSuggestionCardProps) {
  return (
    <div className="space-y-3 rounded border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI 추천 결과</h3>
        {suggestion.source === "mock" ? (
          <span className="text-xs text-muted-foreground">
            AI 일시적 오류로 기본 추천을 표시합니다
          </span>
        ) : null}
      </div>

      <p className="text-lg font-bold">{suggestion.suggestedPrice.toLocaleString("ko-KR")}원</p>

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">혜택</p>
        <ul className="list-inside list-disc space-y-0.5 text-sm">
          {suggestion.benefits.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">주차 구성</p>
        <ol className="space-y-1 text-sm">
          {suggestion.programStructure.map((w) => (
            <li key={w.week}>
              <span className="font-medium">{w.week}주차 — {w.title}</span>
              <span className="text-muted-foreground"> {w.description}</span>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-sm text-muted-foreground">{suggestion.reason}</p>

      <div className="flex gap-2">
        <Button type="button" onClick={() => onApply(suggestion)}>
          추천 반영
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          닫기
        </Button>
      </div>
    </div>
  );
}
