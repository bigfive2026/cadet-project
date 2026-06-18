import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * 멤버십 플랜 카드 목록 (SPEC-002 FR-005, SPEC-003 FR-003, FR-006, AC-003).
 * isActiveMember: 현재 사용자가 이미 이 크리에이터의 멤버인지 여부.
 * joinAction: 각 플랜 가입 시 호출할 Server Action (planId => void).
 * - isActiveMember true → "멤버십 가입 완료" 비활성 버튼
 * - isActiveMember false → "멤버십 가입하기" 활성 버튼
 */
export interface MembershipPlanCardListProps {
  plans: Array<{
    id: string;
    title: string;
    description?: string | null;
    priceKrw: number;
  }>;
  isActiveMember: boolean;
  joinAction?: (planId: string) => Promise<void>;
}

export function formatKrw(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

export function MembershipPlanCardList({ plans, isActiveMember, joinAction }: MembershipPlanCardListProps) {
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
              {isActiveMember ? (
                <Button size="sm" disabled>
                  멤버십 가입 완료
                </Button>
              ) : joinAction ? (
                <form action={joinAction.bind(null, plan.id)}>
                  <Button type="submit" size="sm">
                    멤버십 가입하기
                  </Button>
                </form>
              ) : (
                <Button size="sm">
                  멤버십 가입하기
                </Button>
              )}
            </CardFooter>
          </Card>
        </li>
      ))}
    </ul>
  );
}
