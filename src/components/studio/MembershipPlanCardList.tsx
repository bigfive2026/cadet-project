import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * 멤버십 플랜 카드 목록 (SPEC-002 FR-005).
 * CTA "멤버십 가입하기" 렌더링만 포함 (가입 로직은 별도 SPEC).
 */
export interface MembershipPlanCardListProps {
  plans: Array<{
    id: string;
    title: string;
    description?: string | null;
    priceKrw: number;
  }>;
}

export function formatKrw(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

export function MembershipPlanCardList({ plans }: MembershipPlanCardListProps) {
  if (plans.length === 0) {
    return <p className="text-sm text-muted-foreground">아직 멤버십 플랜이 없습니다.</p>;
  }
  return (
    <ul className="space-y-2">
      {plans.map((plan) => (
        <li key={plan.id}>
          <Card>
            <CardHeader>
              <CardTitle>{plan.title}</CardTitle>
            </CardHeader>
            {plan.description ? (
              <CardContent>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardContent>
            ) : null}
            <CardFooter className="flex items-center justify-between">
              <span className="font-medium">{formatKrw(plan.priceKrw)}</span>
              <Button size="sm">멤버십 가입하기</Button>
            </CardFooter>
          </Card>
        </li>
      ))}
    </ul>
  );
}
