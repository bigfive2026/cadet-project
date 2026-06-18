---
engine: postgresql
orm: prisma
multi_tenant: none
access_control: application-layer
status: planned
---

# Access Control & RLS Policies — ArtBridge

> **전략 결정**: `/moai db init` 인터뷰에서 **단일 스키마 / 멀티테넌시 없음**을 선택했습니다.
> 따라서 PostgreSQL RLS(Row-Level Security)는 **활성화하지 않으며**, 데이터 접근 제어는
> **애플리케이션 레이어**(Next.js Server Actions / Route Handlers + Auth.js 또는
> `MockAuthProvider`)에서 담당합니다.

---

## 결정 근거

- 단일 플랫폼(신진작가-팬)으로 테넌트 격리가 필요 없음
- 배포 환경(Vercel + Neon/Supabase)에서는 커넥션당 DB 역할 분리보다 앱 레이어 인증이 단순
- `tech.md` §8: `getCurrentUser()` 추상화로 Mock/Auth.js 전환. 권한 검사는 이 함수 기반

---

## Application-Layer Access Control

데이터베이스 RLS 대신 다음 패턴으로 접근을 통제합니다.

### 역할 기반 접근 (`Role` enum)

| Role | 설명 | 접근 범위 |
|------|------|----------|
| `FAN` | 후원자/참여자 | 본인 `Membership`, `ProgramApplication`, `Notification`, `Review` |
| `CREATOR` | 신진작가 | 본인 `CreatorProfile`과 그 하위(`MembershipPlan`, `Post`, `Program`) 및 관련 신청/결제 |

### 권한 검사 패턴 (Server Action / Route Handler)

```ts
// 모든 쓰기 작업 전 소유권/역할 검증
import { getCurrentUser } from '@/lib/auth';

async function assertCreatorOwnsProgram(programId: number) {
  const user = await getCurrentUser();
  if (user.role !== 'CREATOR') throw new ForbiddenError();

  const program = await prisma.program.findUnique({
    where: { id: programId },
    include: { creatorProfile: true },
  });
  if (program?.creatorProfile.userId !== user.id) {
    throw new ForbiddenError();
  }
}
```

---

## Access Control Matrix (앱 레이어)

| Table | anonymous | FAN | CREATOR | admin(향후) |
|-------|-----------|-----|---------|-------------|
| `users` | NONE | SELECT (own row) | SELECT (own row) | ALL |
| `creator_profiles` | SELECT (public) | SELECT | SELECT + UPDATE (own) | ALL |
| `membership_plans` | SELECT | SELECT | SELECT + INSERT + UPDATE (own) | ALL |
| `memberships` | NONE | SELECT (own) + INSERT | SELECT (plan owner) | ALL |
| `posts` | SELECT (PUBLIC only) | SELECT (PUBLIC + 자기 멤버십 범위) | SELECT + INSERT + UPDATE (own) | ALL |
| `programs` | SELECT | SELECT | SELECT + INSERT + UPDATE (own) | ALL |
| `program_applications` | NONE | SELECT (own) + INSERT | SELECT (own program) + UPDATE status | ALL |
| `contracts` | NONE | SELECT (own) | SELECT (own program) | ALL |
| `payments` | NONE | SELECT (own) | SELECT (own program) + INSERT | ALL |
| `settlements` | NONE | NONE | SELECT (own program) | ALL |
| `notifications` | NONE | SELECT + UPDATE (own) | SELECT + UPDATE (own) | ALL |
| `reviews` | SELECT | SELECT + INSERT (본인 참여 프로그램) | SELECT | ALL |

---

## 향후 RLS 도입 시 (선택, 배포 환경이 Supabase인 경우)

Supabase 배포로 전환하며 DB 레벨 보안 강화가 필요해지면 아래 정책을 활성화할 수 있습니다.
현재는 **비활성 상태로 보관**합니다.

```sql
-- 예시: Supabase RLS (현재 미사용)
-- ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "memberships_owner_select"
--   ON memberships FOR SELECT
--   USING (auth.uid() = user_id);
```

| Table | Policy Name | Operation | Condition | Notes |
|-------|------------|-----------|-----------|-------|
| _(미사용 — 앱 레이어에서 통제)_ | | | | |

---

## 감사 로깅 (권장)

결제/정산 상태 전환(`Payment.status`, `Settlement.status`)은 민감하므로,
앱 레이어에서 상태 변경 시 감사 로그를 남길 것을 권장합니다.

- 변경 전/후 상태, 수행자 ID, 타임스탬프 기록
- Mock 결제 환경에서도 상태머신 무결성 검증에 활용
