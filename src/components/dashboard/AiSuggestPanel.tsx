"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AiSuggestionCard } from "@/components/dashboard/AiSuggestionCard";
import type { Suggestion } from "@/lib/ai/suggest";

/**
 * AI 추천 요청 패널 (SPEC-010 FR-001, FR-009, AC-007).
 * description·duration·category·targetAudience 입력부 + "AI 추천 받기" 버튼.
 * 요청 중에는 버튼 비활성화 + "AI 추천 생성 중..." 표시로 중복 요청을 막는다(FR-009).
 */
export interface AiSuggestPanelProps {
  onApply: (suggestion: Suggestion) => void;
  defaultCategory?: string;
}

interface SuggestResponse extends Suggestion {
  source: "openai" | "mock";
}

export function AiSuggestPanel({ onApply, defaultCategory }: AiSuggestPanelProps) {
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [category, setCategory] = useState(defaultCategory ?? "");
  const [targetAudience, setTargetAudience] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuggestResponse | null>(null);

  async function handleSuggest(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/programs/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          duration: duration.trim() || undefined,
          category: category.trim() || undefined,
          targetAudience: targetAudience.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "추천 요청에 실패했습니다.");
        return;
      }
      const data = (await res.json()) as SuggestResponse;
      setResult(data);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || description.trim() === "";

  return (
    <section className="space-y-3 rounded border p-4">
      <h2 className="text-sm font-semibold">AI 가격·혜택 추천</h2>

      <form onSubmit={handleSuggest} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="ai-description">
            프로그램 설명
          </label>
          <textarea
            id="ai-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="예: 4주 드로잉 챌린지"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="ai-duration">
              운영 기간
            </label>
            <input
              id="ai-duration"
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="예: 4주"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="ai-category">
              카테고리
            </label>
            <input
              id="ai-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="예: 드로잉"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="ai-audience">
            타깃 독자
          </label>
          <input
            id="ai-audience"
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="예: 초심자"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={disabled}>
          {loading ? "AI 추천 생성 중..." : "AI 추천 받기"}
        </Button>
      </form>

      {result ? (
        <AiSuggestionCard
          suggestion={result}
          onApply={(s) => {
            onApply(s);
            setResult(null);
          }}
          onClose={() => setResult(null)}
        />
      ) : null}
    </section>
  );
}
