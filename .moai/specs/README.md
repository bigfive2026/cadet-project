# ArtBridge MVP SPEC 인덱스

본 문서는 ArtBridge MVP 8개 SPEC의 마스터 인덱스다. 각 SPEC은 `/moai run SPEC-XXX`로 독립 실행 가능하며, PRD §3.2 최소 성공선 및 §15 인수 기준에 추적 가능하다.

> **기준 문서**: `/Users/hanjin/codeit/0. 문서 목적.md` (PRD), `/Users/hanjin/codeit/prisma/schema.prisma` (실제 스키마 — PRD §7 초안보다 우선), `/Users/hanjin/codeit/package.json` (Next.js 16 App Router, TS, Prisma 6, Tailwind 4, shadcn/ui).

---

## 1. SPEC 목록

| SPEC ID | 제목 | PRD §3.2 매핑 | PRD §15 매핑 | 스키마 보완 |
|---|---|---|---|---|
| [SPEC-001](./SPEC-001/spec.md) | Mock 인증 및 Creator/Fan 역할 전환 | item 1 | "Creator/Fan 역할로 로그인 또는 전환 가능" | (없음 — 선택) |
| [SPEC-002](./SPEC-002/spec.md) | 크리에이터 스튜디오 페이지 | items 2, 3 | "크리에이터 스튜디오가 시드 데이터로 표시됨" | **필수**: `CreatorProfile` 필드 보완(cover/profile image, category, links) |
| [SPEC-003](./SPEC-003/spec.md) | 멤버십 플랜·가입 및 멤버 전용 포스트 접근 제어 | item 4 | "멤버십 플랜 표시", "팬이 멤버십에 가입 가능", "멤버 전용 포스트 잠금/공개" | (선택) `Membership.status`, `MembershipPlan.benefits/maxMembers` |
| [SPEC-004](./SPEC-004/spec.md) | 프로그램(클럽) CRUD | item 5 | "크리에이터가 프로그램을 만들 수 있음" | **필수**: `Program` 보완(price, dates, status, maxParticipants, soft delete) + `ProgramStatus` enum 신설 |
| [SPEC-005](./SPEC-005/spec.md) | 팬 참여 신청·수락/거절 및 알림 | items 6, 7 | "팬이 신청", "수락/거절", "알림 생성/읽음" | **필수**: `ProgramApplicationStatus`에 `AUTO_REJECTED`, `CANCELLED` 추가 |
| [SPEC-006](./SPEC-006/spec.md) | 계약(약관) 및 Mock 결제 | item 8 | "계약/약관 동의와 Mock 결제 흐름 동작" | **필수**: `Contract` 보완(agreedAmount, fanSignedAt, creatorSignedAt) |
| [SPEC-007](./SPEC-007/spec.md) | 커뮤니티 및 멤버 관리 | (item 7 간접) | "커뮤니티 접근 제어 동작" | **필수**: `CommunityPost` 모델 신규 생성 |
| [SPEC-008](./SPEC-008/spec.md) | 프로그램 완료 처리 및 리뷰 | item 8 | "완료 후 리뷰 작성 가능" | **필수**: `Review`에 `@@unique([programId, userId])` 제약 추가 |
| [SPEC-009](./SPEC-009/spec.md) | PAID 포스트 단건 구매 (Mock 결제) | (§4.2 P1) | — | **Run 시 선행**: `Payment.postId String?` + `Post.payments` 역관계 (안 A 권장, 미확정) |
| [SPEC-010](./SPEC-010/spec.md) | AI 가격·혜택·프로그램 구성 추천 | (§4.2 P1) | — | 없음 (`.env`에 `OPENAI_API_KEY` 추가 + Mock 폴백) |

---

## 2. 의존성 그래프

```
SPEC-001 (Auth)
   │
   ▼
SPEC-002 (Studio Page)
   │
   ├─────────────────┬───────────────────┐
   ▼                 ▼                   ▼
SPEC-003        SPEC-004            (스튜디오 탭 호스트)
(Membership     (Program CRUD)
 + Post Access)   │
   │              ▼
   │         SPEC-005 (Application + Notification)
   │              │
   │              ▼
   └────────▶ SPEC-006 (Contract + Mock Payment)
                  │
                  ▼
              SPEC-007 (Community + Member Mgmt)  ◀── SPEC-003 (isActiveMember), SPEC-005 (ACCEPTED)
                  │
                  ▼
              SPEC-008 (Completion + Review)

// P1 확장 (MVP 데모 성공선 외, 선택)
SPEC-003 ──▶ SPEC-009 (PAID 포스트 단건 구매)
SPEC-004 ──▶ SPEC-010 (AI 가격·혜택 추천)
```

### 구현 순서 권장 (순차 + 병렬)

1. **Phase A**: `SPEC-001` (독립)
2. **Phase B**: `SPEC-002` (SPEC-001 선행)
3. **Phase C (병렬 가능)**: `SPEC-003`, `SPEC-004` (둘 다 SPEC-002 선행)
4. **Phase D**: `SPEC-005` (SPEC-004 선행)
5. **Phase E**: `SPEC-006` (SPEC-005 선행)
6. **Phase F**: `SPEC-007` (SPEC-003, SPEC-005, SPEC-006 선행)
7. **Phase G**: `SPEC-008` (SPEC-006 선행; SPEC-007 느슨한 의존)
8. **Phase H (P1, 선택)**: `SPEC-009` (SPEC-003 선행), `SPEC-010` (SPEC-004 선행) — 병렬 가능, MVP 데모 성공선 외

---

## 3. 스키마 보완 필요 사항 요약

실제 `prisma/schema.prisma`는 PRD §7 초안과 여러 부분에서 차이가 있다. 본 SPEC들은 **실제 스키마를 기준**으로 작성되었다. **Task A(스키마 보완, 2026-06-18)**에서 아래 "반영됨" 항목이 `schema.prisma`와 `seed.ts`에 적용되었으며 `prisma generate` 완료. DB 동기화(`db push`)는 사용자 직접 실행 예정.

### 신규 모델/enum 생성

| 항목 | 관련 SPEC | 상태 |
|---|---|---|
| `enum ProgramStatus { DRAFT, RECRUITING, CLOSED, CONTRACTING, IN_PROGRESS, COMPLETED, CANCELLED }` | SPEC-004, 005, 006, 008 | **반영됨** (Task A) |
| `model CommunityPost` (신규) | SPEC-007 | **반영됨** (Task A) |

### enum 값 추가

| 항목 | 관련 SPEC | 상태 |
|---|---|---|
| `ProgramApplicationStatus.AUTO_REJECTED` | SPEC-005 | **반영됨** (Task A) |
| `ProgramApplicationStatus.CANCELLED` | SPEC-005 | **반영됨** (Task A) |

### 모델 필드 추가

| 모델 | 추가 필드 | 관련 SPEC | 상태 |
|---|---|---|---|
| `CreatorProfile` | `coverImageUrl`, `profileImageUrl`, `category`, `instagramUrl`, `websiteUrl` | SPEC-002 | **반영됨** (Task A) |
| `CreatorProfile` | `followerCount`, `avgRating` | SPEC-002, 008 | 미반영 (선택, Run 시 판단) |
| `MembershipPlan` | `benefits String[]`, `maxMembers Int?`, `isActive Boolean` | SPEC-003 | 미반영 (`description`으로 우회 가능) |
| `Membership` | `status MembershipStatus` | SPEC-003 | 미반영 (레코드 존재 기반 우회) |
| `Program` | `priceKrw @default(0)`, `category`, `startDate`, `endDate`, `recruitDeadline`, `maxParticipants`, `status ProgramStatus`, `deletedAt` | SPEC-004, 005, 006, 008 | **반영됨** (Task A, priceKrw는 마이그레이션 안전을 위해 default 0) |
| `Contract` | `agreedAmount @default(0)`, `fanSignedAt`, `creatorSignedAt` | SPEC-006 | **반영됨** (Task A, 의사결정 #1: 별도 필드) |
| `Review` | `@@unique([programId, userId])` 제약 | SPEC-008 | **반영됨** (Task A) |
| `Review` | `revieweeId`, `tags String[]` | SPEC-008 | 미반영 (의사결정 #4: 단방향 리뷰) |
| `Notification` | `linkUrl String?` | SPEC-005 | **반영됨** (Task A, 의사결정 #3) |
| `Payment` | `postId String?` + `Post.payments` 역관계 | SPEC-009 | **미확정** — 안 A 권장, Run 시 사용자 확인 필요 |

### 이미 실제 스키마에 존재하며 PRD와 이름이 다른 항목 (주의)

- `PostVisibility`(실제) vs `PostAccessLevel`(PRD) — 값 `MEMBER_ONLY`(실제) vs `MEMBERS_ONLY`(PRD). **실제 기준 `MEMBER_ONLY` 사용**.
- `MembershipPlan.creatorProfileId`(실제) vs `creatorId`(PRD).
- `MembershipPlan.priceKrw`(실제) vs `price`(PRD). 필드명 `title`(실제) vs `name`(PRD).
- `Post.body`(실제) vs `content`(PRD), `Post.visibility`(실제) vs `accessLevel`(PRD).
- `ProgramApplication.userId`(실제) vs `fanId`(PRD).
- `Contract.applicationId`(실제, 1:1) vs `programId`(PRD, 1:1). `terms Json`(실제) vs `terms String`(PRD).
- `Payment.feeKrw`(실제) vs `fee`(PRD). `Payment.fanUserId`(실제) vs `contractId unique`(PRD — 실제는 nullable + 비unique).
- `Review.comment`(실제) vs `text`(PRD). `Review.userId`(실제) vs `reviewerId`(PRD). `revieweeId`, `tags` 누락.
- `Notification.type String`(실제) vs `NotificationType` enum(PRD). `Notification.readAt`(실제) vs `isRead Boolean`(PRD).

---

## 4. PRD §3.2 최소 성공선 매핑 검증

| PRD §3.2 item | 담당 SPEC | 인수 기준 |
|---|---|---|
| 1. Mock 또는 실제 로그인으로 Creator/Fan 전환 가능 | SPEC-001 | AC-001, AC-002 |
| 2. 크리에이터 스튜디오 페이지 표시 | SPEC-002 | AC-001, AC-002, AC-003 |
| 3. 멤버십 플랜 표시 | SPEC-002 (탭 표시) + SPEC-003 (생성/가입) | SPEC-002 AC-003, SPEC-003 AC-002 |
| 4. 멤버 전용 포스트 잠금/공개 처리 | SPEC-003 | AC-001, AC-002 |
| 5. 클럽/프로그램 생성 및 상세 표시 | SPEC-004 | AC-001, AC-002, AC-003 |
| 6. 팬의 참여 신청 | SPEC-005 | AC-001, AC-002 |
| 7. 크리에이터의 수락/거절 + 알림 | SPEC-005 | AC-003, AC-004, AC-007, AC-008 |
| 8. 결제 Mock 또는 sandbox 상태 전환 후 리뷰 작성 | SPEC-006 (결제) + SPEC-008 (리뷰) | SPEC-006 AC-004, SPEC-008 AC-005 |

> 커뮤니티(SPEC-007)는 §3.2 최소 8개에 직접 포함되지 않으나, §3.1 데모 플로우 step 13과 §15.1 "커뮤니티 접근 제어 동작"을 충족한다.

---

## 5. 주요 의사결정 사항 (2026-06-18 확정)

모든 결정은 사용자 승인 완료. 스키마 보완(Task A)과 SPEC-009/010 작성(Task D)에 반영됨.

| # | 항목 | 결정 | 반영 위치 |
|---|---|---|---|
| 1 | Contract 서명 모델 | **별도 필드 추가**: `agreedAmount Int`, `fanSignedAt DateTime?`, `creatorSignedAt DateTime?` | schema.prisma Contract, SPEC-006 |
| 2 | 크리에이터 자동 서명 | **별도 액션**(자동 아님): 팬·크리에이터 각각 별도 서명 액션. 데모에선 크리에이터 서명을 대시보드에서 1클릭 처리 | SPEC-006 FR |
| 3 | Notification.linkUrl | **추가**: `linkUrl String?` 필드. 클릭 시 정확한 타깃 라우팅 | schema.prisma Notification, SPEC-005 |
| 4 | 리뷰 방향 | **팬→크리에이터 단방향**: `revieweeId` 추가 안 함. `@@unique([programId, userId])`만 추가 | schema.prisma Review, SPEC-008 |
| 5 | PAID 포스트 단건 구매 | **SPEC-009로 분리**: SPEC-003는 MEMBERS_ONLY 잠금 UI까지만. SPEC-009에서 PAID Mock 구매 처리 (Task D) | SPEC-009 (신규) |
| 6 | AI 가격·혜택 추천 | **SPEC-010로 분리**: OpenAI JSON schema + Mock 폴백 (Task D) | SPEC-010 (신규) |

---

## 6. 데모 안정성 원칙 (모든 SPEC 공통)

- **Mock-first**: Auth, Payment는 외부 의존 없이 동작 (PRD §5.2).
- **시드 데이터 필수**: 모든 SPEC은 빈 화면 없이 시연 가능한 시드를 전제 (PRD §4.1, Task 02).
- **검증 명령**: 각 SPEC의 인수 기준은 `npm run lint`, `npm run typecheck`, `npm run build` 통과를 포함 (PRD §17).
- **기능 Freeze**: 6/21 이후 본 SPEC의 신규 기능 추가는 금지, 데모 안정화만 허용 (PRD §16).
