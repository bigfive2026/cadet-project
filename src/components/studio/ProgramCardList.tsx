import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKrw } from "@/components/studio/MembershipPlanCardList";

/**
 * 프로그램 카드 목록 (SPEC-002).
 */
export interface ProgramCardListProps {
  programs: Array<{
    id: string;
    title: string;
    description?: string | null;
    category?: string | null;
    priceKrw: number;
  }>;
}

export function ProgramCardList({ programs }: ProgramCardListProps) {
  if (programs.length === 0) {
    return <p className="text-sm text-muted-foreground">아직 프로그램이 없습니다.</p>;
  }
  return (
    <ul className="space-y-2">
      {programs.map((program) => (
        <li key={program.id}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{program.title}</CardTitle>
                {program.category ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {program.category}
                  </span>
                ) : null}
              </div>
            </CardHeader>
            {program.description ? (
              <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {program.description}
                </p>
              </CardContent>
            ) : null}
            <CardContent>
              <p className="text-sm font-medium">{formatKrw(program.priceKrw)}</p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
