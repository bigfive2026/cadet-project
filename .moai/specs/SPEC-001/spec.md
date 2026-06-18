# SPEC-001: Mock 인증 및 Creator/Fan 역할 전환

## 1. 개요

- **목적**: 데모 환경에서 안정적으로 동작하는 Mock 인증을 구현하고, 크리에이터(creator)와 팬(fan) 역할을 한 번에 전환할 수 있게 한다.
- **배경**: PRD §3.2 최소 성공선 item 1("Mock 또는 실제 로그인으로 Creator/Fan 전환 가능"), §4.1 P0 "역할 기반 로그인", §5.2 "시간이 부족하면 MockAuthProvider와 seed user로 역할 전환을 구현한다", §8.1 Auth API, Task 03.
- **범위**:
  - **포함**: `/login` 페이지, 크리에이터/팬 로그인 버튼, 세션 저장(`getCurrentUser()`), 헤더 역할 표시, 보호 라우트 리다이렉트, 시드 사용자(creator 2명, fan 2명 이상) 활용.
  - **제외**: Auth.js 통합, OAuth, 비밀번호 기반 회원가입, 이메일 인증, 세션 만료/갱신 정책. (PRD §4.1 "가능한 Auth 활용"이지만 §5.2 기준 Mock 우선)

## 2. 사용자 스토리

- As a **발표자**, I want **버튼 한 번으로 크리에이터 또는 팬으로 로그인**할 수 있게 하고, so that **데모 중 역할 전환이 끊기지 않는다**.
- As a **크리에이터**, I want **로그인 후 자동으로 크리에이터 대시보드로 이동**하고, so that **내 스튜디오를 바로 관리할 수 있다**.
- As a **팬**, I want **로그인 후 작가 탐색 페이지로 이동**하고, so that **작가와 프로그램을 바로 둘러볼 수 있다**.
- As a **미인증 사용자**, I want **보호 페이지에 접근하면 로그인 페이지로 리다이렉트**되고, so that **인증되지 않은 상태로 보호 기능이 실행되지 않는다**.

## 3. 관련 모델 및 상태

### 관련 Prisma 모델 (실제 `prisma/schema.prisma` 기준)

- **`User`** (테이블 `users`):
  - `id: String @id @default(cuid())`
  - `email: String @unique`
  - `name: String`
  - `role: Role @default(FAN)` — `Role` enum { `FAN`, `CREATOR` }
  - `createdAt`, `updatedAt`
  - 관계: `creatorProfile CreatorProfile?`, `memberships Membership[]`, `applications ProgramApplication[]` 등
- **`CreatorProfile`** (테이블 `creator_profiles`):
  - `id`, `userId @unique @map("user_id")`, `studioName @map("studio_name")`, `bio String?`
  - 1:1 관계 with `User`

### 상태 전환

- 본 SPEC은 도메인 상태 머신을 포함하지 않는다. 세션은 단순 저장/제거만 수행한다.

### 스키마 보완 필요 (PRD §7 대비 누락)

PRD 초안에는 `User`가 `passwordHash`, `avatarUrl`, `bio` 필드를 가지지만 실제 스키마에는 없다. 본 SPEC은 **이 필드들을 요구하지 않는다** (Mock 인증이므로 비밀번호 불필요). 아바타/바이오는 `CreatorProfile.bio`와 URL 문자열로 대체한다.

**권장 보완 (본 SPEC 의존성은 아님)**: 시드 데이터 보강용으로 `avatarUrl` 추가를 고려할 수 있으나, 본 SPEC 범위에서는 강제하지 않는다.

## 4. 기능 요구사항 (EARS)

- **FR-001**: WHEN 사용자가 `/login` 페이지에 접근하면, THE SYSTEM SHALL 두 개의 명확한 로그인 버튼("크리에이터로 시작하기", "팬으로 시작하기")을 표시해야 한다.
- **FR-002**: WHEN 사용자가 "크리에이터로 시작하기" 버튼을 클릭하면, THE SYSTEM SHALL 시드된 크리에이터 `User`(role=CREATOR, 연결된 `CreatorProfile` 존재) 중 하나를 현재 세션으로 설정하고 `/dashboard/creator`로 리다이렉트해야 한다.
- **FR-003**: WHEN 사용자가 "팬으로 시작하기" 버튼을 클릭하면, THE SYSTEM SHALL 시드된 팬 `User`(role=FAN) 중 하나를 현재 세션으로 설정하고 `/creators`로 리다이렉트해야 한다.
- **FR-004**: THE SYSTEM SHALL `getCurrentUser()` 유틸리티를 제공하고, 이는 서버 컴포넌트/라우트 핸들러/server action에서 호출 시 현재 세션의 `User` 레코드(또는 null)를 반환해야 한다.
- **FR-005**: IF 인증되지 않은 사용자가 보호 라우트(`/dashboard/*`, `/notifications`, `/contracts/*`, 생성/수정 액션 등)에 접근하면, THE SYSTEM SHALL 해당 사용자를 `/login`으로 리다이렉트해야 한다.
- **FR-006**: WHILE 사용자가 로그인된 상태이면, THE SYSTEM SHALL 헤더에 현재 사용자 이름과 역할("크리에이터"/"팬")을 표시해야 한다.
- **FR-007**: WHEN 사용자가 로그아웃 액션을 호출하면, THE SYSTEM SHALL 세션을 초기화하고 `/login`으로 이동해야 한다.
- **FR-008**: THE SYSTEM SHALL 세션 저장소로 cookie(권장) 또는 localStorage를 사용하되, 향후 Auth.js 마이그레이션을 깨지 않도록 `getCurrentUser()` 추상화 뒤에 캡슐화해야 한다.
- **FR-009**: IF `CreatorProfile`이 연결되지 않은 크리에이터로 로그인을 시도하면, THE SYSTEM SHALL 해당 시드 사용자를 건너뛰고 `CreatorProfile`이 있는 사용자만 선택해야 한다 (또는 시드에 항상 `CreatorProfile`이 있도록 보장).

## 5. 비기능 요구사항

- **NFR-001 (보안)**: 세션 식별자는 예측 불가능한 값이어야 한다. (UUID/cuid 또는 서명된 쿠키)
- **NFR-002 (데모 안정성)**: 시드 사용자가 없어 빈 화면이 나오지 않도록, `prisma db seed`는 최소 2명의 크리에이터(각각 `CreatorProfile` 포함)와 2명의 팬을 생성해야 한다.
- **NFR-003 (호환성)**: Mock 인증 구현체는 인터페이스 뒤에 숨겨야 하며, Auth.js 도입 시 동일한 `getCurrentUser()` 시그니처를 유지해야 한다.
- **NFR-004 (접근제어)**: 보호 라우트 판정은 서버 측에서 수행되어야 한다 (클라이언트 전용 게이트 금지).
- **NFR-005 (데모 안정성)**: Mock 인증은 외부 서비스(OAuth provider, 이메일 발송)에 의존하지 않아야 한다.

## 6. API / Server Action 명세

PRD §8.1 기준. Next.js App Router (Route Handler 또는 Server Action 혼용 허용).

| 기능 | 식별자 | 메서드 | 경로/함수 | 권한 | 입/출력 요약 |
|---|---|---|---|---|---|
| 현재 사용자 조회 | `getCurrentUser()` | — | 서버 유틸 (lib/auth.ts) | 공개 | 입력 없음 → `User \| null` |
| 역할 로그인 | `loginAs(role)` | POST | `/api/auth/login` 또는 Server Action `loginAs` | 공개 | `{ role: "CREATOR" \| "FAN", seedIndex?: number }` → 세션 쿠키 설정 + `{ redirect }` |
| (옵션) 특정 시드 사용자 선택 | `loginAsUser(userId)` | POST | Server Action | 공개 | `{ userId: string }` → 세션 설정 (데모 중 여러 크리에이터 전환 시 유용) |
| 로그아웃 | `logout()` | POST | `/api/auth/logout` 또는 Server Action | 인증됨 | 입력 없음 → 세션 제거 |

- 권장 구현: `cookies()` Next.js API로 세션 쿠키(`ab_session`) 저장, 값은 `User.id`.
- `getCurrentUser()`는 쿠키 읽기 → `prisma.user.findUnique({ where: { id }, include: { creatorProfile: true } })`.

## 7. UI / 페이지

PRD §13.1 기준.

| 경로 | 사용자 | 주요 컴포넌트 |
|---|---|---|
| `/login` | 공통 | 두 개의 카드형 버튼 ("크리에이터로 시작하기" / "팬으로 시작하기"), 각 버튼 하단에 시드 사용자 이름 미리보기(옵션) |
| 헤더(전역 레이아웃) | 공통 | 현재 사용자 이름, 역할 배지, 로그아웃 버튼 |
| 보호 라우트 진입 | — | 미인증 시 `/login` 리다이렉트 (미들웨어 또는 레이아웃 서버 컴포넌트에서 처리) |

## 8. 인수 기준 (Acceptance Criteria)

- **AC-001**: Given 시드 사용자가 로드된 상태에서, When 발표자가 `/login`에서 "크리에이터로 시작하기"를 클릭하면, Then 브라우저는 `/dashboard/creator`로 이동하고 헤더에 크리에이터 이름과 "크리에이터" 배지가 표시된다.
- **AC-002**: Given 위 상태에서, When 발표자가 헤더 "로그아웃"을 클릭한 뒤 "팬으로 시작하기"를 클릭하면, Then 브라우저는 `/creators`로 이동하고 헤더에 팬 이름과 "팬" 배지가 표시된다.
- **AC-003**: Given 미인증 상태에서, When 사용자가 직접 `/dashboard/creator` URL로 접근하면, Then `/login`으로 리다이렉트된다 (HTTP 307/308 또는 클라이언트 리다이렉트).
- **AC-004**: Given 서버 컴포넌트에서, When `getCurrentUser()`를 호출하면, Then 로그인된 경우 `User` 객체(필요 시 `creatorProfile` 포함)를, 미로그인 경우 `null`을 반환한다.
- **AC-005**: Given 시드 스크립트 실행 후, When 데이터베이스를 조회하면, Then 최소 2명의 `User`(role=CREATOR, 각각 `CreatorProfile` 보유)과 2명의 `User`(role=FAN)가 존재한다.
- **AC-006**: Given Mock 인증 활성 상태에서, When 외부 OAuth 서비스가 응답하지 않아도, Then 로그인 흐름은 정상 동작한다 (외부 의존성 없음).
- **AC-007**: `npm run lint`, `npm run typecheck`, `npm run build`가 모두 에러 없이 통과된다.

## 9. 의존성 및 선행 SPEC

- **선행 SPEC**: 없음 (최초 구현 대상).
- **후행 SPEC**: SPEC-002 이하 모든 SPEC은 본 SPEC의 `getCurrentUser()`와 세션 모델에 의존한다.
- **의존성 데이터**: `prisma db seed`가 먼저 실행 가능해야 한다 (본 SPEC에 시드 스크립트 로직 일부 포함 권장; 전체 시드는 SPEC-002와 협력).

## 10. 제외 사항 (Won't)

- PRD §4.1 "회원가입"(`/api/auth/register`) — 데모에서 시드 사용자만 사용하므로 제외.
- Auth.js (NextAuth) 실제 통합 — 시간이 남을 경우 별도 SPEC으로 분리 (PRD §5.2).
- 비밀번호 해시/OAuth 토큰 저장 — Mock이므로 불필요.
- 이메일 인증, 비밀번호 재설정 — MVP 범위 밖.
- 세션 만료 시간, refresh 토큰 — 데모 세션은 브라우저 세션 쿠키로 충분.
- 관리자(ADMIN) 역할 — PRD에 명시되지 않음 (Won't §4.3 "관리자 정산 페이지" 제외와 일관).

---

## 11. 구현 노트 (Implementation Notes)

> 본 섹션은 Level 1(spec-first) SYNC 단계에서 추가된 구현 기록이다. 원본 요구사항(§1–§10)은 수정되지 않았다.

### 상태

- **Status**: COMPLETED
- **Sync 날짜**: 2026-06-18

### 구현 파일

| 파일 | 책임 |
|---|---|
| `src/lib/auth.ts` | `getCurrentUser()`, `requireUser()`, `requireRole()` 서버 유틸 (NFR-003 추상화 만족) |
| `src/lib/session.ts` | `getSessionUserId()` — `ab_session` 쿠키 읽기 |
| `src/lib/types.ts` | `AppUser`, `AppCreatorProfile` 타입 정의 |
| `src/app/login/page.tsx` | 크리에이터/팬 로그인 버튼 2개 (FR-001) |
| `src/app/login/actions.ts` | `loginAs(role)` Server Action (FR-002, FR-003, FR-009) |
| `src/components/Header.tsx` | 역할 배지 + 사용자 이름 + 로그아웃 (FR-006, FR-007) |
| `src/proxy.ts` | 미들웨어: 보호 라우트 미인증 시 `/login` 리다이렉트 (FR-005, AC-003, NFR-004) |
| `prisma/seed.ts` | 시드 사용자(크리에이터 2 + 팬 2 이상) (FR-009, NFR-002, AC-005) |

### 구현 접근

- 세션 저장소: cookie `ab_session` = `User.id` (권장 방식 채택).
- `getCurrentUser()` 추상화로 Mock 구현체를 Auth.js로 교체 가능한 경로 보존 (NFR-003 만족).
- 보호 라우트 판정은 `src/proxy.ts` 미들웨어에서 서버 측 수행 (NFR-004 만족).

### 인수 기준 결과

- **AC-001**: PASS — 크리에이터 로그인 시 `/dashboard/creator` 이동 + 헤더 역할 배지 표시.
- **AC-002**: PASS — 팬 로그인 시 `/creators` 이동 + "팬" 배지 표시.
- **AC-003**: PASS — 미인증 보호 라우트 접근 시 `src/proxy.ts` 미들웨어가 `/login`로 리다이렉트.
- **AC-004**: PASS — `getCurrentUser()`가 로그인 시 `User`(필요 시 `creatorProfile` 포함), 미로그인 시 `null` 반환.
- **AC-005**: PASS — 시드 스크립트가 최소 2 크리에이터(프로필 포함) + 2 팬 보장.
- **AC-006**: PASS — 외부 OAuth 의존성 없이 정상 동작 (NFR-005).
- **AC-007**: PASS — lint/typecheck/build 전부 0 에러 (사전 검증 완료).

### 설계 결정

- **Auth.js 대신 Mock Auth 채택**: PRD §5.2 시간 박스 기준 (NFR-005). 외부 의존성 제거로 데모 안정성 확보.
- `AppCreatorProfile`은 SPEC-002에서 5개 nullable 필드(`category`, `coverImageUrl`, `profileImageUrl`, `instagramUrl`, `websiteUrl`) 추가로 확장됨 — 하위 호환.
