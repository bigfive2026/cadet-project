"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * 커뮤니티 글 작성 폼 (SPEC-007 FR-004, AC-004).
 * title/content를 POST /api/community-posts로 제출하고 성공 시 목록을 새로고침한다.
 */
interface CommunityPostComposerProps {
  creatorProfileId: string;
}

export function CommunityPostComposer({ creatorProfileId }: CommunityPostComposerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/community-posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creatorProfileId, title, content }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(data.error || "글 작성 중 오류가 발생했습니다.");
          return;
        }

        setTitle("");
        setContent("");
        router.refresh();
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border rounded-lg p-4">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        required
        maxLength={200}
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용을 입력하세요"
        required
        rows={4}
        className="w-full rounded-md border px-3 py-2 text-sm"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "작성 중…" : "글 작성"}
        </Button>
      </div>
    </form>
  );
}
