"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * 리뷰 작성 폼 (SPEC-008 FR-005, FR-007, FR-010, AC-005, AC-007).
 * 별점 1~5(라디오) + 코멘트(선택). 이미 작성한 경우 완료 메시지.
 * 리뷰는 수정/삭제 불가하므로 관련 액션은 제공하지 않는다 (FR-010, NFR-005).
 */
export function ReviewForm({
  programId,
  alreadyReviewed,
}: {
  programId: string;
  alreadyReviewed: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(alreadyReviewed);

  if (submitted) {
    return <p className="text-sm text-muted-foreground">리뷰 작성이 완료되었습니다.</p>;
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
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "작성 중..." : "리뷰 작성"}
      </Button>
    </form>
  );
}
