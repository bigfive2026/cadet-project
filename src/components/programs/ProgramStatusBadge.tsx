import type { ProgramStatus } from "@prisma/client";
import { PROGRAM_STATUS_LABELS } from "@/lib/program-status";
import { cn } from "@/lib/utils";

/**
 * 프로그램 상태 배지 (SPEC-004 FR-004, AC-003, AC-005, AC-006).
 * 호출자는 effectiveStatus()로 평가한 상태를 넘긴다.
 */
const STATUS_STYLES: Record<ProgramStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  RECRUITING: "bg-emerald-100 text-emerald-700",
  CLOSED: "bg-amber-100 text-amber-700",
  CONTRACTING: "bg-sky-100 text-sky-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-violet-100 text-violet-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export function ProgramStatusBadge({
  status,
  className,
}: {
  status: ProgramStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {PROGRAM_STATUS_LABELS[status]}
    </span>
  );
}
