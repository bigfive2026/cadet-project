/**
 * 프로그램 참여자 목록 (SPEC-007 FR-009, AC-007).
 * ACCEPTED 신청자를 모두 표시하되, 결제 상태 배지("결제 완료"/"결제 대기")로 구분한다.
 * 결제 완료 = contract.payments 중 status IN [PAID, RELEASED].
 */
const PAID_STATUSES = ["PAID", "RELEASED"];

interface ParticipantRow {
  id: string;
  user: { id: string; name: string };
  contract: {
    payments: Array<{ status: string }>;
  } | null;
}

interface ParticipantListProps {
  participants: ParticipantRow[];
}

/** 참여자의 결제 완료 여부를 파생한다 (AC-007). */
export function isParticipantPaid(participant: ParticipantRow): boolean {
  return Boolean(
    participant.contract?.payments.some((p) => PAID_STATUSES.includes(p.status)),
  );
}

export function ParticipantList({ participants }: ParticipantListProps) {
  if (participants.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        아직 참여자가 없습니다.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {participants.map((participant) => {
        const paid = isParticipantPaid(participant);
        return (
          <li
            key={participant.id}
            className="flex items-center justify-between gap-4 border rounded-lg p-4"
          >
            <p className="font-medium truncate">{participant.user.name}</p>
            <span
              className={
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 " +
                (paid
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400")
              }
            >
              {paid ? "결제 완료" : "결제 대기"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
