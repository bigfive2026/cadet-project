/**
 * 크리에이터 스튜디오 활성 멤버 목록 (SPEC-007 FR-008, AC-006).
 * 이름, 플랜명, 가입일을 표시한다.
 */
interface MemberRow {
  id: string;
  startedAt: Date | string;
  user: { id: string; name: string };
  plan: { id: string; title: string };
}

interface MemberListProps {
  members: MemberRow[];
}

export function MemberList({ members }: MemberListProps) {
  if (members.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        아직 멤버가 없습니다.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {members.map((member) => (
        <li
          key={member.id}
          className="flex items-center justify-between gap-4 border rounded-lg p-4"
        >
          <div className="min-w-0">
            <p className="font-medium truncate">{member.user.name}</p>
            <p className="text-sm text-muted-foreground">{member.plan.title}</p>
          </div>
          <p className="text-xs text-muted-foreground shrink-0">
            {new Date(member.startedAt).toLocaleDateString("ko-KR")} 가입
          </p>
        </li>
      ))}
    </ul>
  );
}
