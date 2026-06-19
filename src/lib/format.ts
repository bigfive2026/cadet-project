/** 표시용 포맷 헬퍼 (SPEC-004 FR-004). */

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** YYYY.MM.DD 형식의 한국어 날짜. */
export function formatDate(value: Date | string | null | undefined): string | null {
  const d = toDate(value);
  if (!d) return null;
  return d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
}

/** YYYY.MM.DD HH:MM 형식의 한국어 날짜시각 (Hydration-safe). */
export function formatDateTime(value: Date | string | null | undefined): string | null {
  const d = toDate(value);
  if (!d) return null;
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 원화 금액 표시 (SPEC-006). 예: 35000 → "₩35,000". */
export function formatKrw(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

/** 시작~종료 기간 표시. 둘 다 없으면 null. */
export function formatProgramPeriod(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): string | null {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `${s} ~ ${e}`;
  if (s) return `${s} ~`;
  if (e) return `~ ${e}`;
  return null;
}
