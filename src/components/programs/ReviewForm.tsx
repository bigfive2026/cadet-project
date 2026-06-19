"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * 리뷰 작성 폼 (SPEC-008 FR-005, FR-007, FR-010, AC-005, AC-007).
 * 별점 1~5(라디오) + 코멘트(선택) + 태그(선택, 최대 5개).
 * 이미 작성한 경우 완료 메시지.
 * 리뷰는 수정/삭제 불가하므로 관련 액션은 제공하지 않는다 (FR-010, NFR-005).
 */
const SUGGESTED_TAGS = [
  "소통이 좋아요",
  "구성이 알차요",
  "가성비가 좋아요",
  "피드백이 유용해요",
  "다시 참여하고 싶어요",
];
const MAX_TAGS = 5;

export function ReviewForm({
  programId,
  alreadyReviewed,
}: {
  programId: string;
  alreadyReviewed: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(alreadyReviewed);

  if (submitted) {
    return <p className="text-sm text-muted-foreground">리뷰 작성이 완료되었습니다.</p>;
  }

  function toggleTag(tag: string) {
    setError(null);
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });
  }

  // @MX:NOTE 외부 리뷰 폼과 중첩을 피하기 위해 form 대신 div + button(onClick) 구조.
  // Enter 입력은 Input의 onKeyDown에서 처리한다.
  function addCustomTag() {
    const trimmed = customTag.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setCustomTag("");
      return;
    }
    if (tags.length >= MAX_TAGS) {
      setError("태그는 최대 5개까지 선택할 수 있습니다.");
      return;
    }
    if (trimmed.length > 20) {
      setError("태그는 최대 20자까지 입력할 수 있습니다.");
      return;
    }
    setTags((prev) => [...prev, trimmed]);
    setCustomTag("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1 || rating > 5) {
      setError("별점은 1~5 사이여야 합니다.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/programs/${programId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "리뷰 작성에 실패했습니다.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <fieldset>
        <legend className="mb-1 text-sm text-muted-foreground">별점</legend>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className={`cursor-pointer rounded border px-3 py-1 text-sm ${
                rating === n ? "border-primary bg-primary/10" : "border-input"
              }`}
            >
              <input
                type="radio"
                name="rating"
                value={n}
                className="sr-only"
                onChange={() => setRating(n)}
              />
              {"★".repeat(n)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1">
        <label htmlFor="comment" className="text-sm text-muted-foreground">
          코멘트 (선택)
        </label>
        <Input
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          placeholder="리뷰를 작성해 보세요."
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm text-muted-foreground">
          태그 (선택 · 최대 {MAX_TAGS}개)
        </legend>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TAGS.map((tag) => {
            const selected = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:text-foreground"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Input
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomTag();
              }
            }}
            maxLength={20}
            placeholder="직접 태그 입력 (최대 20자)"
            className="max-w-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={tags.length >= MAX_TAGS}
            onClick={addCustomTag}
          >
            추가
          </Button>
        </div>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`${tag} 태그 제거`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </fieldset>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "작성 중..." : "리뷰 작성"}
      </Button>
    </form>
  );
}
