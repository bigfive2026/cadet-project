"use client";

/**
 * 프로그램 탐색 필터 (PRD §4.2 P1 — 검색/필터).
 * GET form 기반 — 입력값 변경 시 즉시 제출되어 URL searchParams 갱신,
 * 서버 컴포넌트(/programs)에서 필터링이 수행된다.
 */
interface ProgramFilterProps {
  categories: string[];
  current: {
    category?: string;
    status?: string;
    priceMax?: string;
    q?: string;
  };
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "전체 상태" },
  { value: "RECRUITING", label: "모집 중" },
  { value: "CONTRACTING", label: "계약 중" },
  { value: "IN_PROGRESS", label: "진행 중" },
  { value: "COMPLETED", label: "완료" },
];

const PRICE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "전체 가격" },
  { value: "10000", label: "1만원 이하" },
  { value: "30000", label: "3만원 이하" },
  { value: "50000", label: "5만원 이하" },
];

export function ProgramFilter({ categories, current }: ProgramFilterProps) {
  return (
    <form
      method="get"
      className="grid gap-3 rounded-xl ring-1 ring-foreground/10 p-4 sm:grid-cols-2 lg:grid-cols-4"
      onChange={(e) => {
        // 검색어 input 변경은 버튼/Enter로 처리; select 변경은 즉시 제출.
        if ((e.target as HTMLElement).tagName === "SELECT") {
          e.currentTarget.requestSubmit();
        }
      }}
    >
      <label className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">검색</span>
        <input
          name="q"
          defaultValue={current.q ?? ""}
          placeholder="제목·설명 검색"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">카테고리</span>
        <select
          name="category"
          defaultValue={current.category ?? ""}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">전체 카테고리</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">모집 상태</span>
        <select
          name="status"
          defaultValue={current.status ?? ""}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground">가격</span>
        <select
          name="priceMax"
          defaultValue={current.priceMax ?? ""}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {PRICE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          필터 적용
        </button>
      </div>
    </form>
  );
}
