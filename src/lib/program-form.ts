/**
 * ProgramForm의 FormData를 검증 스키마 입력 형태로 변환한다 (SPEC-004 FR-001, FR-006).
 * 생성: 빈 선택 필드는 생략(undefined). 수정: 빈 선택 필드는 null(초기화)로 전송.
 */

function str(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

/** 생성 폼 → programCreateSchema 입력. */
export function parseProgramCreateForm(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    title: str(formData.get("title")),
    priceKrw: Number(formData.get("priceKrw")),
  };
  const status = str(formData.get("status"));
  if (status) obj.status = status;
  const description = str(formData.get("description"));
  if (description) obj.description = description;
  const category = str(formData.get("category"));
  if (category) obj.category = category;
  const startDate = str(formData.get("startDate"));
  if (startDate) obj.startDate = startDate;
  const endDate = str(formData.get("endDate"));
  if (endDate) obj.endDate = endDate;
  const recruitDeadline = str(formData.get("recruitDeadline"));
  if (recruitDeadline) obj.recruitDeadline = recruitDeadline;
  const maxParticipants = str(formData.get("maxParticipants"));
  if (maxParticipants) obj.maxParticipants = Number(maxParticipants);
  return obj;
}

/** 수정 폼 → programUpdateSchema 입력. 빈 clearable 필드는 null로 초기화. */
export function parseProgramUpdateForm(formData: FormData): Record<string, unknown> {
  const maxParticipants = str(formData.get("maxParticipants"));
  return {
    title: str(formData.get("title")),
    priceKrw: formData.get("priceKrw") ? Number(formData.get("priceKrw")) : undefined,
    status: str(formData.get("status")),
    description: str(formData.get("description")) ?? null,
    category: str(formData.get("category")) ?? null,
    startDate: str(formData.get("startDate")) ?? null,
    endDate: str(formData.get("endDate")) ?? null,
    recruitDeadline: str(formData.get("recruitDeadline")) ?? null,
    maxParticipants: maxParticipants ? Number(maxParticipants) : null,
  };
}
