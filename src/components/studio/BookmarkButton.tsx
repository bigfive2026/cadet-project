"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleBookmarkAction } from "@/app/(app)/creators/[creatorId]/actions";

/**
 * 관심 작가 북마크 토글 버튼 (PRD §13.2).
 * 팬 전용 — 크리에이터 본인 스튜디오에서는 렌더링하지 않는다(page에서 판단).
 * Server Action(toggleBookmarkAction)을 호출하고 결과로 북마크 상태를 갱신한다.
 */
export function BookmarkButton({
  creatorProfileId,
  initialBookmarked,
}: {
  creatorProfileId: string;
  initialBookmarked: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await toggleBookmarkAction(creatorProfileId);
      if (result.ok) {
        setBookmarked(result.bookmarked);
      }
    });
  }

  return (
    <Button
      type="button"
      variant={bookmarked ? "default" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={bookmarked}
    >
      {pending ? "처리 중..." : bookmarked ? "관심 작가 ✓" : "관심 작가 추가"}
    </Button>
  );
}
