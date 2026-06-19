"use client";

import type { ProgramStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PROGRAM_STATUS_LABELS } from "@/lib/program-status";

/**
 * 프로그램 생성/수정 폼 (SPEC-004 FR-001, FR-006, 7장 ProgramForm).
 * - 생성: initial 미전달, 상태 선택은 DRAFT/RECRUITING만 노출.
 * - 수정: initial 전달, 본 SPEC이 다루는 전이 가능한 상태(DRAFT/RECRUITING/CLOSED/CANCELLED) 노출.
 */
export interface ProgramFormInitial {
  title: string;
  description?: string | null;
  priceKrw: number;
  category?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  recruitDeadline?: string | null;
  maxParticipants?: number | null;
  status: ProgramStatus;
}

interface ProgramFormProps {
  action: (formData: FormData) => void | Promise<void>;
  initial?: ProgramFormInitial;
  mode?: "create" | "edit";
  submitLabel?: string;
}

const CREATE_STATUSES: ProgramStatus[] = ["RECRUITING", "DRAFT"];
const EDIT_STATUSES: ProgramStatus[] = ["DRAFT", "RECRUITING", "CLOSED", "CANCELLED"];

function field(value: string | null | undefined): string {
  return value ?? "";
}

export function ProgramForm({ action, initial, mode = "create", submitLabel }: ProgramFormProps) {
  const statuses = mode === "edit" ? EDIT_STATUSES : CREATE_STATUSES;

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="title">
          제목
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={field(initial?.title)}
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="예: 4주 드로잉 챌린지"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="description">
          설명
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={field(initial?.description)}
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="프로그램 소개를 입력하세요"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="priceKrw">
            가격 (원)
          </label>
          <input
            id="priceKrw"
            name="priceKrw"
            type="number"
            min={0}
            required
            defaultValue={initial ? String(initial.priceKrw) : ""}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="35000"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="category">
            카테고리
          </label>
          <input
            id="category"
            name="category"
            type="text"
            defaultValue={field(initial?.category)}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="예: 클래스"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="startDate">
            시작일
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={field(initial?.startDate)}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="endDate">
            종료일
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={field(initial?.endDate)}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="recruitDeadline">
            모집 마감일
          </label>
          <input
            id="recruitDeadline"
            name="recruitDeadline"
            type="date"
            defaultValue={field(initial?.recruitDeadline)}
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="maxParticipants">
            모집 인원
          </label>
          <input
            id="maxParticipants"
            name="maxParticipants"
            type="number"
            min={1}
            defaultValue={initial?.maxParticipants != null ? String(initial.maxParticipants) : ""}
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="20"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="status">
          상태
        </label>
        <select
          id="status"
          name="status"
          defaultValue={initial?.status ?? "RECRUITING"}
          className="w-full rounded border px-3 py-2 text-sm"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {PROGRAM_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit">{submitLabel ?? (mode === "edit" ? "수정 저장" : "프로그램 만들기")}</Button>
    </form>
  );
}
