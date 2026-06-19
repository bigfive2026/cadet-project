"use client";

import { useState } from "react";
import { ProgramForm, type ProgramFormInitial } from "@/components/dashboard/ProgramForm";
import { AiSuggestPanel } from "@/components/dashboard/AiSuggestPanel";
import type { Suggestion } from "@/lib/ai/suggest";

/**
 * 신규 프로그램 생성 클라이언트 영역 (SPEC-010 FR-005, AC-002).
 * ProgramForm(uncontrolled)을 감싸 추천 반영값을 defaultValue 로 주입한다.
 * 추천 반영은 폼 상태만 갱신하고 DB 에 저장하지 않는다(FR-005).
 *
 * ProgramForm 자체는 수정하지 않는다 — rev 키로 remount 하여
 * 갱신된 defaultValue(priceKrw/description)를 반영한다.
 */
export interface NewProgramClientProps {
  action: (formData: FormData) => void | Promise<void>;
}

export function NewProgramClient({ action }: NewProgramClientProps) {
  const [priceKrw, setPriceKrw] = useState<number | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  function handleApply(s: Suggestion) {
    setPriceKrw(s.suggestedPrice);
    const block = [
      "[혜택]",
      ...s.benefits,
      "",
      "[주차 구성]",
      ...s.programStructure.map((w) => `${w.week}주차: ${w.title} — ${w.description}`),
      "",
      `[추천 사유] ${s.reason}`,
    ].join("\n");
    setDescription((prev) => (prev && prev.trim() !== "" ? `${prev}\n\n${block}` : block));
    setRev((r) => r + 1);
  }

  const initial: ProgramFormInitial | undefined =
    priceKrw !== null || description !== null
      ? {
          title: "",
          description,
          priceKrw: priceKrw ?? 0,
          category: null,
          startDate: null,
          endDate: null,
          recruitDeadline: null,
          maxParticipants: null,
          status: "RECRUITING",
        }
      : undefined;

  return (
    <div className="space-y-4">
      <AiSuggestPanel onApply={handleApply} />
      <ProgramForm key={rev} action={action} mode="create" initial={initial} />
    </div>
  );
}
