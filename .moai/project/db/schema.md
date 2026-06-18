---
engine: postgresql
orm: prisma
migration_tool: prisma-migrate
multi_tenant: none
schema_source: prisma/schema.prisma
last_synced_at: 2026-06-18T09:02:06Z
manifest_hash: f8c55180566830c781e16f9d2b8214644071b29a2bc8975c9aa0e10c1ae42799
status: migrated
---

# Database Schema — ArtBridge

> 양면형 거래 플랫폼(신진작가-팬) 데이터 모델. 원본 근거: `product.md` §6 도메인 용어,
> `tech.md` §1 스택(PostgreSQL + Prisma).
>
> **상태**: 본 문서는 `prisma/schema.prisma`의 실제 구현(12개 모델)을 기반으로
> `/moai db refresh`에 의해 재구축되었습니다. 스키마 변경 시 `prisma migrate dev` 후
> `moai-domain-db-docs` 훅이 자동 동기화합니다.
>
> **매핑 규칙**: Prisma 모델명(PascalCase) ↔ 물리 테이블명(snake_case, `@@map`).
> 모든 PK는 `cuid()` 문자열(`String`), `@updatedAt` 필드는 Prisma가 자동 갱신.

---

## Tables

| Table | Prisma Model | Columns | Primary Key | Source |
|-------|--------------|---------|-------------|--------|
| `users` | `User` | 6 | `id` | `prisma/schema.prisma` |
| `creator_profiles` | `CreatorProfile` | 6 | `id` | `prisma/schema.prisma` |
| `membership_plans` | `MembershipPlan` | 7 | `id` | `prisma/schema.prisma` |
| `memberships` | `Membership` | 6 | `id` | `prisma/schema.prisma` |
| `posts` | `Post` | 8 | `id` | `prisma/schema.prisma` |
| `programs` | `Program` | 6 | `id` | `prisma/schema.prisma` |
| `program_applications` | `ProgramApplication` | 7 | `id` | `prisma/schema.prisma` |
| `contracts` | `Contract` | 5 | `id` | `prisma/schema.prisma` |
| `payments` | `Payment` | 9 | `id` | `prisma/schema.prisma` |
| `settlements` | `Settlement` | 6 | `id` | `prisma/schema.prisma` |
| `notifications` | `Notification` | 7 | `id` | `prisma/schema.prisma` |
| `reviews` | `Review` | 6 | `id` | `prisma/schema.prisma` |

### Column Detail

#### `users`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | String(cuid) | NO | `cuid()` | PK |
| `email` | String | NO | — | UNIQUE |
| `name` | String | NO | — | |
| `role` | enum `Role` | NO | `FAN` | `FAN` \| `CREATOR` |
| `created_at` | DateTime | NO | `now()` | |
| `updated_at` | DateTime | NO | `updatedAt()` | 자동 갱신 |

#### `creator_profiles`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | String(cuid) | NO | `cuid()` | PK |
| `user_id` | String | NO | — | UNIQUE FK → `users.id` (Cascade) |
| `studio_name` | String | NO | — | |
| `bio` | String | YES | — | |
| `created_at` | DateTime | NO | `now()` | |
| `updated_at` | DateTime | NO | `updatedAt()` | |

#### `membership_plans`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | String(cuid) | NO | `cuid()` | PK |
| `creator_profile_id` | String | NO | — | FK → `creator_profiles.id` (Cascade) |
| `title` | String | NO | — | |
| `description` | String | YES | — | |
| `price_krw` | Int | NO | — | 원화 가격 |
| `created_at` | DateTime | NO | `now()` | |
| `updated_at` | DateTime | NO | `updatedAt()` | |

#### `memberships`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | String(cuid) | NO | `cuid()` | PK |
| `user_id` | String | NO | — | FK → `users.id` (Cascade) |
| `plan_id` | String | NO | — | FK → `membership_plans.id` (Cascade) |
| `started_at` | DateTime | NO | `now()` | |
| `created_at` | DateTime | NO | `now()` | |
| `updated_at` | DateTime | NO | `updatedAt()` | |

#### `posts`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | String(cuid) | NO | `cuid()` | PK |
| `creator_profile_id` | String | NO | — | FK → `creator_profiles.id` (Cascade) |
| `title` | String | NO | — | |
| `body` | String | NO | — | |
| `visibility` | enum `PostVisibility` | NO | `PUBLIC` | `PUBLIC` \| `MEMBER_ONLY` \| `PAID` |
| `price_krw` | Int | YES | — | 유료 포스트(PAID)일 때만 |
| `created_at` | DateTime | NO | `now()` | |
| `updated_at` | DateTime | NO | `updatedAt()` | |

#### `programs`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | String(cuid) | NO | `cuid()` | PK |
| `creator_profile_id` | String | NO | — | FK → `creator_profiles.id` (Cascade) |
| `title` | String | NO | — | |
| `description` | String | YES | — | |
| `created_at` | DateTime | NO | `now()` | |
| `updated_at` | DateTime | NO | `updatedAt()` | |

#### `program_applications`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | String(cuid) | NO | `cuid()` | PK |
| `program_id` | String | NO | — | FK → `programs.id` (Cascade) |
| `user_id` | String | NO | — | FK → `users.id` (Cascade) |
| `status` | enum `ProgramApplicationStatus` | NO | `PENDING` | `PENDING` \| `ACCEPTED` \| `REJECTED` \| `AUTO_REJECTED` \| `CANCELLED` |
| `message` | String | YES | — | 신청 메시지 |
| `created_at` | DateTime | NO | `now()` | |
| `updated_at` | DateTime | NO | `updatedAt()` | |

#### `contracts`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | String(cuid) | NO | `cuid()` | PK |
| `application_id` | String | NO | — | UNIQUE FK → `program_applications.id` (Cascade) |
| `terms` | Json | NO | — | 계약 조건(JSON) |
| `agreed_at` | DateTime | NO | `now()` | |
| `created_at` | DateTime | NO | `now()` | |

#### `payments`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | String(cuid) | NO | `cuid()` | PK |
| `membership_id` | String | YES | — | FK → `memberships.id` (SetNull) |
| `contract_id` | String | YES | — | FK → `contracts.id` (SetNull) |
| `fan_user_id` | String | NO | — | FK → `users.id` (Cascade) |
| `amount` | Int | NO | — | 결제 금액(KRW) |
| `fee_krw` | Int | NO | `0` | 플랫폼 수수료(10%) |
| `status` | enum `PaymentStatus` | NO | `PENDING` | `PENDING` \| `PAID` \| `RELEASED` \| `REFUNDED` \| `FAILED` |
| `created_at` | DateTime | NO | `now()` | |
| `updated_at` | DateTime | NO | `updatedAt()` | |

#### `settlements`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | String(cuid) | NO | `cuid()` | PK |
| `payment_id` | String | NO | — | UNIQUE FK → `payments.id` (Cascade) |
| `payout` | Int | NO | — | 정산 금액(amount - fee_krw) |
| `status` | enum `SettlementStatus` | NO | `PENDING` | `PENDING` \| `RELEASED` |
| `created_at` | DateTime | NO | `now()` | |
| `updated_at` | DateTime | NO | `updatedAt()` | |

#### `notifications`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | String(cuid) | NO | `cuid()` | PK |
| `user_id` | String | NO | — | FK → `users.id` (Cascade) |
| `type` | String | NO | — | 알림 타입 식별자 |
| `message` | String | NO | — | |
| `link_url` | String | YES | — | 클릭 시 이동 경로(SPEC-005) |
| `read_at` | DateTime | YES | — | 미읽음 여부 판별(null = 안 읽음) |
| `created_at` | DateTime | NO | `now()` | |

#### `reviews`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | String(cuid) | NO | `cuid()` | PK |
| `program_id` | String | NO | — | FK → `programs.id` (Cascade) |
| `user_id` | String | NO | — | FK → `users.id` (Cascade) |
| `rating` | Int | NO | — | 평점 |
| `comment` | String | YES | — | |
| `created_at` | DateTime | NO | `now()` | |

---

## Enums

| Enum | Values | Used By |
|------|--------|---------|
| `Role` | `FAN`, `CREATOR` | `users.role` |
| `PostVisibility` | `PUBLIC`, `MEMBER_ONLY`, `PAID` | `posts.visibility` |
| `ProgramApplicationStatus` | `PENDING`, `ACCEPTED`, `REJECTED`, `AUTO_REJECTED`, `CANCELLED` | `program_applications.status` |
| `PaymentStatus` | `PENDING`, `PAID`, `RELEASED`, `REFUNDED`, `FAILED` | `payments.status` |
| `SettlementStatus` | `PENDING`, `RELEASED` | `settlements.status` |

---

## Relationships

> 카디널리티 표기: 1:1, 1:N, N:M

| From | To | Cardinality | FK Column | onDelete | Notes |
|------|----|-------------|-----------|----------|-------|
| `users` | `creator_profiles` | 1:1 | `creator_profiles.user_id` | Cascade | 크리에이터만 프로필 보유 |
| `creator_profiles` | `membership_plans` | 1:N | `membership_plans.creator_profile_id` | Cascade | 작가가 여러 플랜 운영 |
| `users` | `memberships` | 1:N | `memberships.user_id` | Cascade | 팬의 가입 memberships |
| `membership_plans` | `memberships` | 1:N | `memberships.plan_id` | Cascade | 플랜별 가입자 |
| `creator_profiles` | `posts` | 1:N | `posts.creator_profile_id` | Cascade | 작성 포스트 |
| `creator_profiles` | `programs` | 1:N | `programs.creator_profile_id` | Cascade | 운영 프로그램 |
| `programs` | `program_applications` | 1:N | `program_applications.program_id` | Cascade | 접수 신청 |
| `users` | `program_applications` | 1:N | `program_applications.user_id` | Cascade | 팬의 신청 이력 |
| `program_applications` | `contracts` | 1:1 | `contracts.application_id` | Cascade | 수락된 신청 계약 |
| `contracts` | `payments` | 1:N | `payments.contract_id` | SetNull | 계약 결제 (nullable) |
| `memberships` | `payments` | 1:N | `payments.membership_id` | SetNull | 멤버십 정기 결제 (nullable) |
| `users` | `payments` | 1:N | `payments.fan_user_id` | Cascade | 팬 결제 (`PaymentFan` relation) |
| `payments` | `settlements` | 1:1 | `settlements.payment_id` | Cascade | 결제당 정산 1건 |
| `users` | `notifications` | 1:N | `notifications.user_id` | Cascade | 수신 알림 |
| `programs` | `reviews` | 1:N | `reviews.program_id` | Cascade | 완료된 프로그램 리뷰 |
| `users` | `reviews` | 1:N | `reviews.user_id` | Cascade | 팬 작성 리뷰 |

---

## Indexes

| Table | Columns | Type | Purpose |
|-------|---------|------|---------|
| `users` | `email` | UNIQUE | 로그인 식별자 (`@unique`) |
| `membership_plans` | `(creator_profile_id)` | INDEX | 작가별 플랜 조회 |
| `memberships` | `(user_id, plan_id)` | UNIQUE COMPOSITE | 중복 가입 방지 (`@@unique`) |
| `memberships` | `(plan_id)` | INDEX | 플랜별 가입자 조회 |
| `posts` | `(creator_profile_id, created_at)` | INDEX | 스튜디오 피드 페이지네이션 |
| `programs` | `(creator_profile_id)` | INDEX | 작가별 프로그램 조회 |
| `program_applications` | `(program_id, status)` | INDEX | 프로그램별 신청 목록 |
| `program_applications` | `(user_id)` | INDEX | 팬별 신청 이력 |
| `payments` | `(status, created_at)` | INDEX | 정산 대기 큐 조회 |
| `notifications` | `(user_id, read_at)` | INDEX | 읽지 않은 알림 조회 |
| `reviews` | `(program_id)` | INDEX | 프로그램별 리뷰 조회 |

> UNIQUE로 선언된 단일 FK(`creator_profiles.user_id`, `contracts.application_id`,
> `settlements.payment_id`)는 자동 UNIQUE 인덱스를 생성합니다.

---

## Constraints

| Table | Constraint | Type | Definition |
|-------|-----------|------|-----------|
| `users` | `users_email_unique` | UNIQUE | email 중복 불가 |
| `creator_profiles` | `creator_profiles_user_id_unique` | UNIQUE | 사용자당 프로필 1개 |
| `memberships` | `memberships_user_id_plan_id_key` | UNIQUE COMPOSITE | (user_id, plan_id) 중복 가입 방지 |
| `contracts` | `contracts_application_id_unique` | UNIQUE | 신청당 계약 1건 |
| `settlements` | `settlements_payment_id_unique` | UNIQUE | 결제당 정산 1건 |

> PostgreSQL에서 Prisma enum은 별도 타입으로 생성되어 값 제약이 자동 적용됩니다
> (`role`, `visibility`, `status` 필드 — 별도 CHECK 제약 불필요).
