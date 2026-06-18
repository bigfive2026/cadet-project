"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * 포스트 생성 폼 컴포넌트 (SPEC-003 FR-012, FR-013).
 * visibility 라디오: PUBLIC / MEMBER_ONLY / PAID.
 * PAID 선택 시 priceKrw 입력 필드 표시.
 */
interface PostCreateFormProps {
  /** 폼 제출 시 호출할 서버 액션 (FormData 기반) */
  action: (formData: FormData) => void | Promise<void>;
}

export function PostCreateForm({ action }: PostCreateFormProps) {
  const [visibility, setVisibility] = useState<"PUBLIC" | "MEMBER_ONLY" | "PAID">("PUBLIC");

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="title">제목</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="포스트 제목을 입력하세요"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="body">본문</label>
        <textarea
          id="body"
          name="body"
          required
          rows={6}
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="포스트 내용을 입력하세요"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium mb-1">공개 설정</legend>
        <div className="flex gap-4">
          {(["PUBLIC", "MEMBER_ONLY", "PAID"] as const).map((v) => (
            <label key={v} className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value={v}
                checked={visibility === v}
                onChange={() => setVisibility(v)}
              />
              {v === "PUBLIC" ? "공개" : v === "MEMBER_ONLY" ? "멤버 전용" : "유료"}
            </label>
          ))}
        </div>
      </fieldset>

      {visibility === "PAID" && (
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="priceKrw">가격 (원)</label>
          <input
            id="priceKrw"
            name="priceKrw"
            type="number"
            min={1}
            required
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="1000"
          />
        </div>
      )}

      <Button type="submit">포스트 발행</Button>
    </form>
  );
}
