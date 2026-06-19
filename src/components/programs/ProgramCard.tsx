import Link from "next/link";
import type { ProgramStatus } from "@prisma/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKrw } from "@/components/studio/MembershipPlanCardList";
import { ProgramStatusBadge } from "@/components/programs/ProgramStatusBadge";
import { effectiveStatus } from "@/lib/program-status";
import { formatProgramPeriod } from "@/lib/format";

/**
 * 공개 프로그램 카드 (SPEC-004 FR-003, 7장 ProgramCard).
 * 제목, 크리에이터, 가격, 모집 상태 배지, 기간을 표시한다.
 * status는 effectiveStatus()로 모집 마감을 반영한다 (FR-005).
 */
export interface ProgramCardItem {
  id: string;
  title: string;
  priceKrw: number;
  category?: string | null;
  status: ProgramStatus;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  recruitDeadline?: Date | string | null;
  creatorProfile?: { id: string; studioName: string } | null;
}

export function ProgramCard({ program }: { program: ProgramCardItem }) {
  const status = effectiveStatus({
    status: program.status,
    recruitDeadline: program.recruitDeadline ? new Date(program.recruitDeadline) : null,
  });
  const period = formatProgramPeriod(program.startDate, program.endDate);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>
            <Link href={`/programs/${program.id}`} className="hover:underline">
              {program.title}
            </Link>
          </CardTitle>
          <ProgramStatusBadge status={status} />
        </div>
        {program.creatorProfile ? (
          <p className="text-xs text-muted-foreground">{program.creatorProfile.studioName}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-1">
        {program.category ? (
          <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs">
            {program.category}
          </span>
        ) : null}
        {period ? <p className="text-xs text-muted-foreground">{period}</p> : null}
      </CardContent>
      <CardFooter>
        <span className="font-medium">{formatKrw(program.priceKrw)}</span>
      </CardFooter>
    </Card>
  );
}
