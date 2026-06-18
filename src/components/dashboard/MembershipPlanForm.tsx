"use client";

import { Button } from "@/components/ui/button";

/**
 * 멤버십 플랜 생성 폼 컴포넌트 (SPEC-003 FR-001).
 */
interface MembershipPlanFormProps {
  action: (formData: FormData) => void | Promise<void>;
}

export function MembershipPlanForm({ action }: MembershipPlanFormProps) {
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="title">플랜 이름</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="예: 브론즈 멤버십"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="priceKrw">월 가격 (원)</label>
        <input
          id="priceKrw"
          name="priceKrw"
          type="number"
          min={1}
          required
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="5000"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="description">설명 (선택)</label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="멤버십 혜택을 설명해주세요"
        />
      </div>

      <Button type="submit">멤버십 플랜 생성</Button>
    </form>
  );
}
