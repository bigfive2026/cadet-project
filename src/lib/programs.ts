import type { Program } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isTransitionAllowed } from "@/lib/program-status";
import { notifyProgramClosed } from "@/lib/applications";
import type { ProgramCreateInput, ProgramUpdateInput } from "@/lib/validation/program";

/**
 * 프로그램 변경(mutation) 서비스 (SPEC-004 FR-001, FR-002, FR-006~FR-008, FR-011, NFR-002, NFR-003).
 *
 * API 라우트와 Server Action 양쪽에서 재사용하는 단일 진실 소스. 인가/소유권/상태전이
 * 규칙을 여기서 일괄 처리하여 중복을 제거한다. 호출자는 결과의 status로 HTTP 응답이나
 * 리다이렉트를 결정한다.
 */
export type ProgramServiceContext = {
  role: string;
  creatorProfileId: string | null | undefined;
};

export type ProgramServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 403 | 404; error: string };

function ensureCreator(
  ctx: ProgramServiceContext,
): ProgramServiceResult<string> {
  if (ctx.role !== "CREATOR" || !ctx.creatorProfileId) {
    return { ok: false, status: 403, error: "Forbidden: CREATOR role required" };
  }
  return { ok: true, data: ctx.creatorProfileId };
}

/**
 * 본인 프로그램을 로드하고 소유권을 검증한다 (NFR-002). 없거나 삭제됨 → 404, 타인 → 403.
 *
 * @MX:ANCHOR: [AUTO] 프로그램 소유권 검증 — 수정/삭제 보안 경계 (NFR-002)
 * @MX:REASON: updateProgram·deleteProgram가 공유하는 인가 게이트 — fan_in >= 2, 우회 시 권한 상승
 */
async function loadOwnedProgram(
  ctx: ProgramServiceContext,
  id: string,
): Promise<ProgramServiceResult<Program & { creatorProfileId: string }>> {
  const guard = ensureCreator(ctx);
  if (!guard.ok) return guard;

  const existing = await prisma.program.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    return { ok: false, status: 404, error: "Program not found" };
  }
  if (existing.creatorProfileId !== guard.data) {
    return { ok: false, status: 403, error: "Forbidden: not the program owner" };
  }
  return { ok: true, data: existing };
}

/** 프로그램 생성 (FR-001, FR-002, AC-001, AC-004). 기본 status는 RECRUITING. */
export async function createProgram(
  ctx: ProgramServiceContext,
  input: ProgramCreateInput,
): Promise<ProgramServiceResult<Program>> {
  const guard = ensureCreator(ctx);
  if (!guard.ok) return guard;

  const program = await prisma.program.create({
    data: {
      ...input,
      creatorProfileId: guard.data,
      status: input.status ?? "RECRUITING",
    },
  });
  return { ok: true, data: program };
}

/** 프로그램 수정 (FR-006, FR-007, AC-005, AC-009, AC-010). 미허용 전이 → 400. */
export async function updateProgram(
  ctx: ProgramServiceContext,
  id: string,
  input: ProgramUpdateInput,
): Promise<ProgramServiceResult<Program>> {
  const owned = await loadOwnedProgram(ctx, id);
  if (!owned.ok) return owned;

  if (input.status && !isTransitionAllowed(owned.data.status, input.status)) {
    return { ok: false, status: 400, error: "Invalid status transition" };
  }

  const updated = await prisma.program.update({ where: { id }, data: input });

  // CLOSED 상태 전이 시 PENDING 신청자들에게 알림 (FR-010, AC-006)
  // 알림 실패해도 업데이트는 롤백하지 않음 (best-effort)
  if (input.status === "CLOSED" && owned.data.status !== "CLOSED") {
    try {
      await notifyProgramClosed(id);
    } catch (error) {
      // 알림 실패는 로깅만 하고 업데이트는 성공으로 처리
      console.error("Failed to send program closed notifications:", error);
    }
  }

  return { ok: true, data: updated };
}

/** 프로그램 soft delete (FR-008, AC-007). 물리 삭제 금지 — deletedAt만 설정. */
export async function deleteProgram(
  ctx: ProgramServiceContext,
  id: string,
): Promise<ProgramServiceResult<{ ok: true }>> {
  const owned = await loadOwnedProgram(ctx, id);
  if (!owned.ok) return owned;

  await prisma.program.update({ where: { id }, data: { deletedAt: new Date() } });
  return { ok: true, data: { ok: true } };
}
