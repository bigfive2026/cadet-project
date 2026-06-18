# Structure — ArtBridge

> 신규 프로젝트(그린필드). 본 문서는 PRD(`0. 문서 목적.md`) §7/§8/§13/§14 기반의 **목표 구조**를 기술한다.
> 실제 코드가 생성되면 이 문서와 `.moai/project/codemaps/`가 실제 디렉토리에 맞춰 업데이트된다.

---

## 1. 아키텍처 개요

- **형태**: Next.js App Router 단일 레포 풀스택 (FE + Route Handlers/Server Actions)
- **패턴**: 도메인 기반 라우팅 + 역할 기반 접근 제어(Creator/Fan) + 상태머신 중심 비즈니스 로직
- **데이터 계층**: Prisma(스키마 퍼스트) + PostgreSQL
- **외부 의존 추상화**: `PaymentProvider` 인터페이스(기본 `MockPaymentProvider`), 인증(`getCurrentUser()` 추상화로 Mock/Auth.js 전환 가능)

### 설계 원칙
- 하나의 크리에이터 스튜디오가 모든 오퍼링(멤버십/포스트/프로그램/커뮤니티)의 중심
- 상태 전이(Program/Application/Payment/Contract)가 비즈니스 로직의 척추 — 부수효과(알림, 자동거절)는 전이 시점에 트리거
- 접근 제어는 `canViewPost(user, post)`, `isActiveMember(fanId, creatorId)` 같은 재사용 함수로 분리
- 외부 연동(PG, AI, Auth)은 인터페이스 기반 — 데모 안정성 우선, Mock 기본

---

## 2. 디렉토리 구조 (실제 구현 — SPEC-001/002 기준)

> **목표 구조 대비 실제 구현 차이**: `(public)/(auth)` 분리 대신 단일 `(app)` 라우트 그룹을 사용한다. 작가 상세 파라미터는 `[id]`가 아닌 `[creatorId]`를 사용한다. 대시보드는 `dashboard/creator/{page,edit/page}.tsx` 형태로 편집 폼이 서브 라우트로 구성됐다.

```
artbridge/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (app)/                # 단일 앱 셸 그룹 (레이아웃 + 공개/대시보드 통합)
│   │   │   ├── creators/
│   │   │   │   ├── page.tsx      # 작가 둘러보기 (/creators) — FR-001
│   │   │   │   └── [creatorId]/  # 작가 스튜디오 (/creators/[creatorId])
│   │   │   │       └── page.tsx  # FR-003, FR-011 (404)
│   │   │   └── dashboard/
│   │   │       └── creator/
│   │   │           ├── page.tsx       # 크리에이터 대시보드 요약 — FR-008
│   │   │           └── edit/page.tsx  # 스튜디오 편집 폼 페이지 — FR-010
│   │   ├── login/                # 로그인 페이지 (라우트 그룹 외부)
│   │   │   ├── page.tsx          # FR-001 (SPEC-001)
│   │   │   └── actions.ts        # loginAs(role) Server Action (SPEC-001)
│   │   └── api/
│   │       └── studio/route.ts   # PATCH /api/studio — FR-009/010, AC-005/006
│   ├── components/
│   │   ├── Header.tsx            # 역할 배지 + 로그아웃 (SPEC-001 FR-006/007)
│   │   ├── ui/                   # shadcn-style: card, button, input
│   │   ├── creators/
│   │   │   └── CreatorCard.tsx
│   │   └── studio/               # StudioHeader, StudioTabs, PostCardList,
│   │                             # MembershipPlanCardList, ProgramCardList, StudioEditForm
│   ├── lib/
│   │   ├── auth.ts               # getCurrentUser / requireUser / requireRole (SPEC-001)
│   │   ├── session.ts            # getSessionUserId (cookie ab_session) (SPEC-001)
│   │   ├── types.ts              # AppUser, AppCreatorProfile (5 신규 nullable 필드 포함)
│   │   ├── prisma.ts             # Prisma client 싱글턴
│   │   ├── utils.ts              # 공용 유틸
│   │   ├── queries/
│   │   │   └── studio.ts         # getCreatorStudio, listCreators (단일 include)
│   │   └── validation/
│   │       └── studio.ts         # Zod studioUpdateSchema
│   └── proxy.ts                  # 미들웨어: 보호 라우트 미인증 시 /login 리다이렉트 (SPEC-001 FR-005)
├── prisma/
│   ├── schema.prisma             # 데이터 모델 (PRD §7) — 5 보완 필드 포함
│   └── seed.ts                   # 시드 (크리에이터 2 + plans + posts + programs + 5 신규 필드)
├── public/
├── .env.example
└── package.json
```

> 미구현(후행 SPEC): `/programs`, `/posts/[id]`, `/notifications`, `/contracts/[id]`, 팬 대시보드, `api/` 하위 (membership-plans, memberships, posts, programs, notifications) — SPEC-003 이하에서 확장 예정.

---

## 3. 핵심 모듈 책임

### 3.1 인증 모듈 (`lib/auth.ts`)
- `getCurrentUser()`: Mock/Auth.js 공통 추상화
- `loginAs(role)`: Mock 사용 시 Creator/Fan 전환
- 시드 유저 기반 데모 세션(cookie 또는 localStorage, 아키텍처에 일관되게)

### 3.2 접근 제어 모듈 (`lib/access.ts`)
- `canViewPost(user, post)`: PUBLIC 전체 허용 / MEMBERS_ONLY 활성 멤버+크리에이터 / PAID 잠금 UI(옵션 Mock 구매)
- `isActiveMember(fanId, creatorId)`: 포스트/커뮤니티 접근 제어 공용 함수

### 3.3 결제 추상화 (`lib/payment/`)
- `PaymentProvider` 인터페이스 + `MockPaymentProvider`(기본)
- 시간 남을 때만 `PortOnePaymentProvider` / `TossPaymentProvider`(sandbox) 확장
- 수수료: `fee = amount * 0.1`, `payout = amount - fee`

### 3.4 AI 추천 (`lib/ai/`)
- `POST /api/programs/ai-suggest`: 프로그램 설명 → JSON 스키마 응답
- API 키 없으면 결정론적 Mock 추천으로 폴백(데모 안전)

### 3.5 상태머신 (비즈니스 로직 척추)
상태 전이 시 부수효과(알림 생성, 자동 거절)를 트리거한다. 전이는 트랜잭션으로 처리한다.

---

## 4. 상태 전이 규칙

### Program.status
| 상태 | 의미 | 전환 조건 |
|---|---|---|
| `DRAFT` | 작성 중 | 임시 저장 |
| `RECRUITING` | 모집 중 | 공개 등록 |
| `CLOSED` | 모집 마감 | 마감일 초과/수동 마감 |
| `CONTRACTING` | 계약 대기 | 팬 신청 수락 |
| `IN_PROGRESS` | 진행 중 | 계약 서명 + 결제 완료 |
| `COMPLETED` | 완료 | 완료 승인 |
| `CANCELLED` | 취소 | 계약 전 취소 |

### Application.status
`PENDING → ACCEPTED | REJECTED | AUTO_REJECTED | CANCELLED`

### Payment.status
`PENDING → PAID(플랫폼 보관) → RELEASED(정산) | FAILED | REFUNDED`

### Contract.status
`PENDING → FAN_SIGNED → CREATOR_SIGNED → SIGNED → CANCELLED`

---

## 5. 데이터 모델 (Prisma)

13개 핵심 모델. 상세 스키마는 PRD §7 및 `.moai/project/db/schema.md` 참조.

| 모델 | 책임 |
|---|---|
| `User` | 계정 + 역할(FAN/CREATOR) |
| `CreatorProfile` | 작가 공개 스튜디오 페이지 |
| `MembershipPlan` | 월 정기 후원 플랜 |
| `Membership` | 팬의 활성 가입 상태 (unique [fanId, creatorId]) |
| `Post` | PUBLIC/MEMBERS_ONLY/PAID 콘텐츠 |
| `Program` | 클럽/프로그램 (RFP Project 대응) |
| `ProgramApplication` | 팬 참여 신청 (unique [programId, fanId]) |
| `Contract` | 프로그램 참여 계약 (1:1 with Program) |
| `Payment` | Mock/sandbox 결제·정산 상태 (1:1 with Contract) |
| `CommunityPost` | 멤버/참여자 전용 커뮤니티 글 |
| `Review` | 완료 후 상호 리뷰 (unique [programId, reviewerId]) |
| `Notification` | 인앱 알림 |
| `Bookmark` | 관심 작가/프로그램 저장 |

### 핵심 관계
- User 1—1 CreatorProfile
- CreatorProfile 1—N (MembershipPlan, Post, Program)
- MembershipPlan 1—N Membership N—1 User(FAN)
- Program 1—N ProgramApplication N—1 User(FAN)
- Program 1—1 Contract 1—1 Payment
- Program 1—N Review (reviewer/reviewee 양측)

---

## 6. 필수 페이지 (PRD §13)

| 경로 | 사용자 | 설명 |
|---|---|---|
| `/` | 공통 | 랜딩 |
| `/login` | 공통 | Creator/Fan 역할 로그인 |
| `/creators` | 팬 | 작가 탐색 |
| `/creators/[id]` | 공통 | 작가 스튜디오 |
| `/posts/[id]` | 공통 | 포스트 상세(접근 제어) |
| `/programs` | 팬 | 프로그램 탐색 |
| `/programs/[id]` | 공통 | 프로그램 상세 |
| `/dashboard/creator` | 크리에이터 | 스튜디오/포스트/프로그램/멤버 관리 |
| `/dashboard/fan` | 팬 | 내 멤버십/신청/결제/리뷰 |
| `/notifications` | 로그인 사용자 | 알림 목록 |
| `/contracts/[id]` | 양측 | 계약/서명/결제 |

### 스튜디오 페이지 구성
커버 이미지 · 프로필 이미지 · 작가명/카테고리/소개 · SNS·웹사이트 링크 · 관심 작가 추가 · 멤버십 가입 버튼 · 탭(소개/포스트/멤버십/클럽/커뮤니티) · 멤버 전용 포스트 잠금 UI · 프로그램 카드 · 커뮤니티 미리보기.

---

## 7. API / Server Action 명세 (요약)

Next.js App Router 기준 Route Handler 또는 Server Action 중 레포 기존 방식을 따른다.

- **Auth**: `getCurrentUser()`, `loginAs(role)`, `POST /api/auth/register`, `POST /api/auth/logout`
- **Creator/Studio**: `GET /api/creators`, `GET /api/creators/:id`, `POST|PATCH /api/studio`
- **Membership**: `POST /api/membership-plans`, `GET /api/creators/:id/membership-plans`, `POST /api/memberships/join`, `isActiveMember()`, `GET /api/studio/members`
- **Post**: `GET /api/creators/:id/posts`, `GET /api/posts/:id`, `POST /api/posts`, `canViewPost()`
- **Program/Application**: `GET|POST /api/programs`, `GET|PATCH|DELETE /api/programs/:id`, `POST /api/programs/:id/applications`, `GET /api/programs/:id/applications`, `PATCH /api/applications/:id`
- **Notification**: `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`
- **AI**: `POST /api/programs/ai-suggest`, `PATCH /api/programs/:id` (추천 반영)
- **Contract/Payment/Review**: `POST /api/programs/:id/contract`, `PATCH /api/contracts/:id/sign`, `POST /api/contracts/:id/payment`, `POST /api/payments/callback`, `POST /api/contracts/:id/approve`, `POST /api/programs/:id/reviews`

필수 알림: 팬 신청→크리에이터 / 수락→팬 / 직접 거절→팬 / 정원마감·자동거절→팬 / 모집마감→신청자 전원.

---

_원본 PRD: `0. 문서 목적.md` §7, §8, §13, §14_
_생성일: 2026-06-18 · 상태: 목표 구조(코드 생성 후 실제 반영 필요)_
