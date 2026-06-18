# SPEC-003: 멤버십 플랜·가입 및 멤버 전용 포스트 접근 제어

> **상태: completed** (2026-06-18) · 방법론: TDD · 커버리지 98.6% (목표 85%) · AC-001~010 전부 통과. 구현 요약은 §11 참조.

## 1. 개요

- **목적**: 크리에이터가 멤버십 플랜을 생성/조회하고, 팬이 멤버십에 가입하며, `visibility=MEMBER_ONLY` 포스트를 활성 멤버에게만 공개하는 접근 제어를 구현한다.
- **배경**: PRD §3.2 최소 성공선 item 4 ("멤버 전용 포스트 잠금/공개 처리") 및 "멤버십 플랜 표시"; §4.1 P0 "멤버십 플랜", "포스트"; §8.3 Membership API, §8.4 Post API; Task 05; §15.1 "팬이 멤버십에 가입 가능", "멤버 전용 포스트가 가입 전에는 잠기고 가입 후에는 열림".
- **범위**:
  - **포함**: 멤버십 플랜 생성(크리에이터 전용), 멤버십 플랜 조회(공개), 멤버십 가입 액션(팬 → `Membership` 생성), `isActiveMember()` 헬퍼, `canViewPost(user, post)` 헬퍼, 포스트 접근 제어(`PUBLIC`/`MEMBER_ONLY`/`PAID`), 포스트 생성(크리에이터 전용, `visibility` 지정), 잠금 UI.
  - **제외**: PAID 포스트의 단건 구매 상태 저장 (PRD §4.2 P1 "단건 유료 포스트 구매 Mock") — 본 SPEC에서는 PAID를 "잠금 UI + 안내"로만 처리, 실제 구매 로직은 별도 SPEC/P1. 반복 결제/정기 결제 (PRD §4.3 Won't). 프로그램(SPEC-004 이상).

## 2. 사용자 스토리

- As a **크리에이터**, I want **멤버십 플랜을 생성**하고(`title`, `priceKrw`, `description`), so that **팬이 정기 후원에 가입할 수 있다**.
- As a **팬**, I want **멤버십 가입 버튼을 클릭**해 가입하고, so that **멤버 전용 콘텐츠를 볼 수 있다**.
- As a **비멤버 팬**, I want **멤버 전용 포스트가 잠겨 있는 것을 보고**, so that **가입 동기를 얻을 수 있다**.
- As a **활성 멤버**, I want **가입 직후 멤버 전용 포스트가 열리는 것**을 보고, so that **가입 보상을 즉시 확인할 수 있다**.
- As a **크리에이터 본인**, I want **내가 작성한 모든 포스트를 공개 여부와 무관하게 볼 수 있고**, so that **작성자가 잠금에 걸리지 않는다**.

## 3. 관련 모델 및 상태

### 관련 Prisma 모델 (실제 `prisma/schema.prisma` 기준)

- **`MembershipPlan`** (`membership_plans`):
  - `id`, `creatorProfileId`, `title`, `description String?`, `priceKrw Int`, `createdAt`, `updatedAt`
  - 관계: `creatorProfile CreatorProfile`, `memberships Membership[]`
- **`Membership`** (`memberships`):
  - `id`, `userId`, `planId`, `startedAt @default(now())`, `createdAt`, `updatedAt`
  - **제약**: `@@unique([userId, planId])` (한 사용자는 동일 플랜에 중복 가입 불가)
  - `@@index([planId])`
  - 관계: `user User`, `plan MembershipPlan`, `payments Payment[]`
  - **주의 (스키마 갭)**: `status` 필드가 **없다**. PRD §7은 `MembershipStatus { ACTIVE, CANCELED }`를 정의하지만 실제 스키마에 반영되지 않았다.
- **`Post`** (`posts`):
  - `id`, `creatorProfileId`, `title`, `body`, `visibility PostVisibility @default(PUBLIC)`, `priceKrw Int?`, `createdAt`, `updatedAt`
  - 관계: `creatorProfile CreatorProfile`
- **`PostVisibility`** enum: `PUBLIC`, `MEMBER_ONLY`, `PAID` (PRD §7 `PostAccessLevel`과 이름 다름, 값 `MEMBER_ONLY`는 PRD의 `MEMBERS_ONLY`와 다름 — 실제 스키마 기준 `MEMBER_ONLY` 사용).
- **`User`**: `role`, `id`. 관계: `memberships Membership[]`.

### 상태 전환

- **멤버십 상태**: 실제 스키마는 `status` 필드가 없으므로, **`Membership` 레코드의 존재 여부**를 "활성 멤버십"으로 간주한다. (가입 = 레코드 생성, 탈퇴 = 레코드 삭제 — Soft delete를 원하면 `status` 추가 필요, 본 SPEC은 존재 기반만 요구).
- **포스트 접근 상태**: `visibility` enum 자체가 접근 등급. 전이 아님.

### 스키마 보완 필요 (선택)

- (선택) `MembershipStatus { ACTIVE, CANCELED }` enum + `Membership.status` 필드 — 탈퇴 이력이 필요하면 추가. MVP에서는 레코드 삭제로 충분하므로 **본 SPEC은 보완을 요구하지 않는다**.
- (선택) `MembershipPlan.benefits String[]`, `maxMembers Int?`, `isActive Boolean` — PRD §4.1 "가격, 혜택, 가입 CTA" 중 혜택 표시용. 데모 품질을 위해 `benefits` 추가를 권장하지만 필수는 아님 (`description`에 자유 텍스트로 대체 가능).

## 4. 기능 요구사항 (EARS)

### 멤버십 플랜

- **FR-001**: WHEN 크리에이터가 멤버십 플랜 생성 폼(`title`, `priceKrw`, `description`)을 제출하면, THE SYSTEM SHALL 본인 `CreatorProfile`에 연결된 새 `MembershipPlan` 레코드를 생성해야 한다.
- **FR-002**: IF 비크리에이터 또는 다른 크리에이터가 플랜 생성 액션을 호출하면, THE SYSTEM SHALL 403을 반환해야 한다.
- **FR-003**: WHEN 스튜디오 페이지 "멤버십" 탭이 로드되면, THE SYSTEM SHALL 해당 크리에이터의 모든 `MembershipPlan`을 `priceKrw`와 함께 표시해야 한다.

### 멤버십 가입

- **FR-004**: WHEN 팬이 "멤버십 가입하기" CTA를 클릭하면, THE SYSTEM SHALL `(userId, planId)` 쌍으로 새 `Membership` 레코드를 생성해야 한다. `startedAt`은 자동으로 현재 시각이 설정된다.
- **FR-005**: IF 동일 `(userId, planId)` 조합이 이미 존재하면, THE SYSTEM SHALL 에러를 발생시키지 않고 "이미 가입된 멤버십" 상태로 처리해야 한다 (PRD Task 05: "가입 중" 표시).
- **FR-006**: WHILE 팬이 해당 크리에이터의 활성 멤버이면, THE SYSTEM SHALL 가입 CTA를 "멤버십 가입 완료" 비활성 상태로 변경해야 한다.
- **FR-007**: THE SYSTEM SHALL `isActiveMember(userId, creatorProfileId)` 헬퍼를 제공하고, 이는 해당 크리에이터의 어떤 `MembershipPlan`에든 연결된 `Membership` 레코드가 존재하면 `true`를 반환해야 한다.

### 포스트 접근 제어

- **FR-008**: THE SYSTEM SHALL `canViewPost(user, post)` 헬퍼를 제공하고, 다음 규칙으로 판정해야 한다:
  - `post.visibility === PUBLIC` → 누구나 `true`
  - `post.creatorProfileId === user.creatorProfile?.id` (작성자 본인) → `true`
  - `post.visibility === MEMBER_ONLY` → `isActiveMember(user.id, post.creatorProfileId)`가 `true`이면 `true`, 아니면 `false`
  - `post.visibility === PAID` → (MVP 범위) 구매 레코드가 없으므로 `false` (잠금 UI 노출). 작성자 본인은 `true`.
- **FR-009**: WHEN 비멤버가 `MEMBER_ONLY` 포스트에 접근하면, THE SYSTEM SHALL 본문 대신 잠금 프리뷰(제목 + "멤버 전용 콘텐츠입니다. 멤버십에 가입하면 열람할 수 있습니다." + 가입 CTA)를 표시해야 한다.
- **FR-010**: WHEN 활성 멤버가 `MEMBER_ONLY` 포스트에 접근하면, THE SYSTEM SHALL 전체 `body`를 표시해야 한다.
- **FR-011**: WHEN 사용자가 `PAID` 포스트에 접근하면, THE SYSTEM SHALL 잠금 UI와 "유료 콘텐츠" 라벨, (선택) 단건 구매 CTA(모달만 띄우고 실제 결제는 처리하지 않음)를 표시해야 한다.
- **FR-012**: WHEN 크리에이터가 포스트 생성 폼(`title`, `body`, `visibility`, `PAID`인 경우 `priceKrw`)을 제출하면, THE SYSTEM SHALL 본인 `CreatorProfile`에 연결된 새 `Post`를 생성해야 한다.
- **FR-013**: IF `visibility === PAID`이면, THE SYSTEM SHALL `priceKrw`가 0보다 큰 정수로 입력되었는지 검증해야 한다.

## 5. 비기능 요구사항

- **NFR-001 (데모 안정성)**: 시드는 최소 1개 `MembershipPlan`(크리에이터당), 최소 2개 `Post`(`PUBLIC` 1 + `MEMBER_ONLY` 1, 선택적으로 `PAID` 1)을 포함해야 한다.
- **NFR-002 (접근제어)**: `canViewPost`는 서버 컴포넌트/라우트 핸들러/server action에서 호출되어야 하며, 본문(`body`)은 접근 허용 시에만 클라이언트에 전달되어야 한다 (잠금 상태에서 `body`가 HTML 응답에 포함되면 안 됨).
- **NFR-003 (트랜잭션)**: `Membership` 생성은 `@@unique([userId, planId])` 제약에 의존하며, 중복 시 Prisma `P2002` 에러를 잡아 "이미 가입됨" 경로로 처리해야 한다.
- **NFR-004 (Mock-first)**: 멤버십 가입은 결제를 요구하지 않는다 (PRD §4.3 반복 결제 Won't와 일관). 가입은 즉시 활성화된다.

## 6. API / Server Action 명세

PRD §8.3, §8.4 기준.

| 기능 | 식별자 | 메서드 | 경로/함수 | 권한 | 입/출력 요약 |
|---|---|---|---|---|---|
| 플랜 생성 | `createMembershipPlan` | POST | `/api/membership-plans` 또는 Server Action | 크리에이터 본인 | `{ title, priceKrw, description? }` → `MembershipPlan` |
| 플랜 조회 | — | GET | `/api/creators/:id/membership-plans` 또는 서버 컴포넌트 직접 조회 | 공개 | → `MembershipPlan[]` |
| 멤버십 가입 | `joinMembership` | POST | `/api/memberships/join` 또는 Server Action | 팬 | `{ planId }` → `Membership` (중복 시 기존 레코드) |
| 가입 여부 확인 | `isActiveMember(userId, creatorProfileId)` | — | lib (lib/membership.ts) | 내부 | → `boolean` |
| 포스트 목록 | — | GET | `/api/creators/:id/posts` 또는 서버 컴포넌트 | 공개 | → `Post[]` (요약만; `body`는 접근 판정 후) |
| 포스트 상세 | — | GET | `/api/posts/:id` 또는 `/posts/[id]` 서버 컴포넌트 | 접근제어 | → 접근 허용 시 전체 `Post`, 거부 시 잠금 프리뷰용 `Post`(본문 없음) |
| 포스트 생성 | `createPost` | POST | `/api/posts` 또는 Server Action | 크리에이터 본인 | `{ title, body, visibility, priceKrw? }` → `Post` |
| 포스트 접근 판정 | `canViewPost(user, post)` | — | lib (lib/post-access.ts) | 내부 | → `boolean` |

## 7. UI / 페이지

PRD §13.1 기준.

| 경로 | 사용자 | 주요 컴포넌트 |
|---|---|---|
| `/creators/[creatorId]` 멤버십 탭 | 공개 | `MembershipPlanCard`(가격/혜택/CTA), 비멤버/멤버 상태별 CTA |
| `/creators/[creatorId]` 포스트 탭 | 공개 | `PostListItem`(`visibility` 배지) |
| `/posts/[id]` | 접근제어 | `PostDetail`(전체 본문) 또는 `LockedPostPreview`(잠금 UI + 가입 CTA) |
| `/dashboard/creator/posts/new` | 크리에이터 본인 | `PostCreateForm`(`visibility` 라디오, `PAID` 시 `priceKrw` 입력) |
| 멤버십 플랜 생성 (`/dashboard/creator/memberships/new`) | 크리에이터 본인 | `MembershipPlanForm` |

## 8. 인수 기준 (Acceptance Criteria)

- **AC-001**: Given 비멤버 팬이, When `MEMBER_ONLY` 포스트 `/posts/[id]`에 접근하면, Then 잠금 프리뷰("멤버 전용 콘텐츠입니다")와 가입 CTA가 표시되고 응답 HTML에 `body`가 포함되지 않는다.
- **AC-002**: Given 위 팬이, When 크리에이터의 멤버십 플랜에 가입(`joinMembership`)한 뒤 동일 포스트를 다시 조회하면, Then 전체 `body`가 표시된다.
- **AC-003**: Given 이미 가입된 팬이, When 동일 플랜에 다시 가입 액션을 호출하면, Then 에러 없이 기존 `Membership` 레코드가 반환되고 스튜디오 멤버십 탭의 CTA가 "멤버십 가입 완료"로 표시된다.
- **AC-004**: Given `PUBLIC` 포스트, When 미로그인 사용자가 접근하면, Then 전체 본문이 표시된다.
- **AC-005**: Given 크리에이터 본인, When 자신이 작성한 `MEMBER_ONLY` 포스트에 접근하면, Then 잠금 없이 전체 본문이 표시된다.
- **AC-006**: Given 크리에이터가, When `visibility=PAID`, `priceKrw=5000`으로 포스트를 생성하면, Then DB에 해당 레코드가 저장되고 비구매자에게 잠금 UI가 표시된다.
- **AC-007**: Given `PAID` 포스트 생성 시, When `priceKrw` 없이 제출하면, Then 폼 검증 에러가 표시되고 레코드가 생성되지 않는다.
- **AC-008**: Given 팬 A의 크리에이터 X에 대한 멤버십, When `isActiveMember(A.id, X.creatorProfileId)`를 호출하면, Then `true`를 반환한다. 크리에이터 Y에 대해서는 `false`를 반환한다.
- **AC-009**: Given 비크리에이터(팬)가, When `createMembershipPlan`을 호출하면, Then 403이 반환된다.
- **AC-010**: `npm run lint`, `npm run typecheck`, `npm run build`가 통과된다.

## 9. 의존성 및 선행 SPEC

- **선행 SPEC**: SPEC-001 (세션/`getCurrentUser()`), SPEC-002 (스튜디오 페이지와 멤버십/포스트 탭 호스트).
- **후행 SPEC**: SPEC-007 (커뮤니티 접근 제어는 `isActiveMember` 또는 프로그램 참여 여부를 재사용).

## 10. 제외 사항 (Won't)

- 반복 결제 / 정기 결제 / 실제 PG — PRD §4.3 Won't, §5.2.
- PAID 포스트의 단건 구매 상태 저장 및 구매 이력 — PRD §4.2 P1 (별도 SPEC 필요 시 분리).
- 멤버십 취소/환불 — PRD §4.3 Won't.
- 댓글 / 좋아요 — PRD §4.1 "댓글은 선택".
- 포스트 썸네일 이미지 업로드 — 실제 `thumbnailUrl` 필드가 스키마에 없음, URL 입력만 허용하지만 본 SPEC 범위 밖 (별도 UX 결정 시).
- 포스트 검색/필터/태그 — PRD §4.2 P1.

## 11. 구현 노트 (Implementation Notes)

구현 완료: 2026-06-18 · 방법론 TDD (RED-GREEN-REFACTOR) · sub-agent 모드.

### 검증 결과
- 테스트: 23 파일 / 136 테스트 통과, 커버리지 98.6% statements · 87.8% branches · 100% functions (목표 85% 초과)
- `npm run lint` 0 errors / 0 warnings · `npm run typecheck` clean · `npm run build` 성공 (AC-010)
- AC-001~AC-010 전부 통과

### 생성/수정 파일
- 헬퍼: `src/lib/membership.ts` (`isActiveMember`), `src/lib/post-access.ts` (`canViewPost`)
- 검증: `src/lib/validation/membership.ts`, `src/lib/validation/post.ts` (PAID → `priceKrw>0` 조건부 검증)
- API: `src/app/api/membership-plans/route.ts`, `src/app/api/posts/route.ts`
- 액션: `src/app/(app)/creators/[creatorId]/actions.ts` (`joinMembership`, P2002 멱등)
- UI 신규: `src/app/(app)/posts/[id]/page.tsx`, `src/components/posts/{PostDetail,LockedPostPreview}.tsx`, `src/components/dashboard/{PostCreateForm,MembershipPlanForm}.tsx`, 대시보드 생성 페이지 2종
- UI 수정: `creators/[creatorId]/page.tsx`, `StudioTabs.tsx`, `MembershipPlanCardList.tsx` (멤버 상태별 가입 CTA)
- 각 모듈에 코로케이션 테스트(.test.ts/.test.tsx) 추가

### 구현상 결정 / 계획 대비 차이
- **NFR-002 (body 미누출)**: `/posts/[id]` 서버 컴포넌트에서 `canViewPost` 판정 후, 허용 시에만 `PostDetail`에 `body` 전달. `LockedPostPreview`는 `body` prop 자체를 갖지 않아 잠금 시 본문이 HTML 응답에 포함되지 않음.
- **가입 CTA 배선**: `"use client"` 컴포넌트 내 인라인 `"use server"` 불가 제약으로, `joinMembership` Server Action을 `MembershipPlanCardList`에 `joinAction` prop으로 주입.
- **T-010 시드**: 기존 `prisma/seed.ts`가 이미 NFR-001(플랜 + PUBLIC/MEMBER_ONLY/PAID 포스트 + 멤버십 1건)을 충족하여 변경 없음.
- **@MX:ANCHOR**: `canViewPost` 및 API 라우트 핸들러에 추가(보안 경계 / fan_in 보호).
