---
engine: postgresql
orm: prisma
seed_strategy: script
seed_tool: prisma db seed (prisma/seed.ts)
status: planned
---

# Seed Data — ArtBridge

> Prisma `db seed` 스크립트(`prisma/seed.ts`) 기반. `package.json`의 `prisma.seed` 설정으로
> `npx prisma db seed` 실행 시 동작. 데모 시연 경로(`product.md` §5 핵심 유저 플로우)를
> 재현할 수 있는 최소 데이터 세트를 목표로 합니다.

---

## Seed Strategy

**Strategy**: Script (Prisma seed script)

데모 시나리오가 역할 전환/상태머신을 따라가므로, 결정론적 스크립트가 팩토리보다 적합.
`@faker-js/faker`는 비데모용 대량 데이터 생성 시에만 보조 사용.

**Seeding tool**: `prisma db seed` → `tsx prisma/seed.ts`

**When seeds run**:
- [x] `make dev-setup` / 로컬 초기 셋업 시
- [x] `prisma migrate reset` 이후 자동 실행 (Prisma 기본 동작)
- [x] 배포 환경(Neon/Supabase) 데모 데이터 주입 시
- [ ] CI 통합 테스트 — 별도 최소 fixture 사용 권장

**Seed order** (FK 제약조건 존중):

1. `users` — 크리에이터 1명 + 팬 2명 (역할 포함)
2. `creator_profiles` — 크리에이터의 스튜디오 페이지
3. `membership_plans` — 크리에이터의 멤버십 플랜 2개
4. `programs` — 크리에이터의 클럽/프로그램 1~2개
5. `posts` — 공개/멤버전용/유료 포스트 각 1개씩 (유료: `demo-post-3`, `priceKrw=5000`)
6. `memberships` — 팬 1명의 멤버십 가입 (결제 PAID 상태)
7. `program_applications` — 팬 1명의 프로그램 신청 (상태 분산: PENDING/ACCEPTED)
8. `contracts` — 수락된 신청의 계약
9. `payments` — 멤버십 결제 + 계약 결제 (수수료 10% 차감) + PAID 포스트 단건 구매 결제(`fans[1]` → `demo-post-3`, SPEC-009)
10. `settlements` — RELEASED 상태 정산 1건 + PAID 포스트 구매 정산 1건(SPEC-009)
11. `notifications` — 수락 알림 등
12. `reviews` — 완료된 프로그램(`demo-program-completed`) 리뷰 2건(rating 4, 5 → 평균 4.5, SPEC-008 NFR-004)

---

## Fixture Locations

| Environment | Path | Format | Notes |
|-------------|------|--------|-------|
| Development / Demo | `prisma/seed.ts` | TypeScript (Prisma Client) | 데모 전체 시나리오 재현 |
| Test / CI | `prisma/seed.test.ts` (권장) | TypeScript | 최소 결정론적 fixture (역할 전환 검증용) |
| Staging | `prisma/seed.ts` (재사용) | TypeScript | 운영 데이터 아님 — 데모 데이터 동일 |

> Mock 인증(`MockAuthProvider`)은 시드 유저를 기반으로 역할을 전환합니다(`tech.md` §8).
> 시드 이메일은 데모 전용 도메인을 사용합니다.

---

## Dev vs Prod Data

**Always seed in dev/test** (안전한 데모 데이터):

- 크리에이터 계정: `creator@artbridge.demo`
- 팬 계정: `fan1@artbridge.demo`, `fan2@artbridge.demo`
- 데모용 멤버십 플랜 / 프로그램 / 포스트
- Mock 결제 내역(`PaymentStatus.PAID` 등 상태 머신 시뮬레이션)
- 수락 알림 샘플

**Never seed in production** (운영에 노출되면 안 되는 데이터):

- `@artbridge.demo` 도메인 계정 (운영 사용자 오용 방지)
- Mock 결제 트랜잭션 (실제 정산 오류 유발)
- 테스트용 `Settlement.RELEASED` 기록 (재무 리포트 왜곡)
- `.env` 시크릿 / 시드 비밀번호 (평문 저장 금지)

**Production-safe reference data** (정적/참조 데이터는 시드 허용):

- enum 값은 Prisma enum으로 스키마에 정의되므로 별도 시드 불필요
- (필요시) 시스템 공지 템플릿, 기본 알림 카테고리

---

## Dev Seed Snapshot (데모 시연 경로 매핑)

`product.md` §5 핵심 유저 플로우를 시드가 커버해야 합니다:

| Flow Step | Seed Coverage |
|-----------|---------------|
| 2. 크리에이터 로그인 → 스튜디오 | `creator@artbridge.demo` + `CreatorProfile` |
| 3. 멤버십 플랜 | `MembershipPlan` 2개 |
| 4. 멤버 전용 포스트 | `Post(MEMBER_ONLY)` 1개 |
| 5. 클럽/프로그램 | `Program` 1개 |
| 6. 팬 전환 | `fan1@artbridge.demo` |
| 8. 팬 참여 신청 | `ProgramApplication(PENDING)` 1개 |
| 9. 크리에이터 수락 | `ProgramApplication(ACCEPTED)` 1개 |
| 10. 수락 알림 | `Notification` 1개 |
| 11. 계약 + Mock 결제 | `Contract` + `Payment(PAID)` |
| 12. PAID 포스트 단건 구매 | `Payment(postId=demo-post-3, status=PAID, feeKrw=500)` + `Settlement(payout=4500, status=PENDING)` — `fans[1]`(fan2) 구매 완료, `fans[0]`(fan1) 미구매(잠금 화면 시연, SPEC-009 NFR-007) |
| 14. 리뷰 | `Review` 2개 (rating 4, 5) — `demo-program-completed`(COMPLETED) |
