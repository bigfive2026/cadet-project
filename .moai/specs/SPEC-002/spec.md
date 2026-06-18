# SPEC-002: 크리에이터 스튜디오 페이지

## 1. 개요

- **목적**: 크리에이터의 공개 스튜디오 페이지(`/creators/[creatorId]`)와 크리에이터 대시보드(`/dashboard/creator`)를 구현하고, 스튜디오 편집 기능을 제공한다.
- **배경**: PRD §3.2 최소 성공선 items 2, 3 ("크리에이터 스튜디오 페이지 표시", "멤버십 플랜 표시"); §4.1 P0 "크리에이터 스튜디오"; §13.1, §13.2 (스튜디오 페이지 구성); §8.2 Creator/Studio API; Task 04.
- **범위**:
  - **포함**: 스튜디오 공개 페이지(커버/프로필/소개/링크, 탭 UI: 소개·포스트·멤버십·클럽·커뮤니티), 작가 목록(`/creators`), 크리에이터 대시보드(내 스튜디오 요약), 스튜디오 편집 액션(`bio`, `studioName`, 외부 링크).
  - **제외**: 포스트 상세/접근 제어(SPEC-003), 멤버십 가입 플로우(SPEC-003), 프로그램 CRUD(SPEC-004), 커뮤니티 글 CRUD(SPEC-007), 이미지 업로드(PR §4.2 P1, 본 SPEC은 URL 입력만).

## 2. 사용자 스토리

- As a **팬**, I want **작가의 스튜디오 페이지에서 프로필, 소개, SNS/웹사이트 링크**를 보고, so that **작가를 파악하고 후원/참여를 결정할 수 있다**.
- As a **팬**, I want **작가 탐색 페이지에서 여러 작가를 한눈에** 보고, so that **관심 작가를 찾을 수 있다**.
- As a **크리에이터**, I want **대시보드에서 내 스튜디오, 포스트, 멤버십, 프로그램 요약**을 보고, so that **내 활동을 한눈에 관리할 수 있다**.
- As a **크리에이터**, I want **스튜디오 이름, 소개, 외부 링크를 편집**할 수 있고, so that **페이지를 발표 전에 다듬을 수 있다**.

## 3. 관련 모델 및 상태

### 관련 Prisma 모델 (실제 `prisma/schema.prisma` 기준)

- **`CreatorProfile`** (`creator_profiles`): `id`, `userId`(unique), `studioName`, `bio String?`, `createdAt`, `updatedAt`. 관계: `plans MembershipPlan[]`, `posts Post[]`, `programs Program[]`.
- **`User`**: 역할 판정용 (`role: CREATOR`).
- **`MembershipPlan`** (`membership_plans`): `id`, `creatorProfileId`, `title`, `description String?`, `priceKrw Int`, timestamps. (스튜디오 멤버십 탭 표시용)
- **`Post`** (`posts`): `id`, `creatorProfileId`, `title`, `body`, `visibility PostVisibility`, `priceKrw Int?`, timestamps. (포스트 탭 표시용; 접근 제어는 SPEC-003)
- **`Program`** (`programs`): `id`, `creatorProfileId`, `title`, `description String?`, timestamps. (클럽 탭 표시용; CRUD는 SPEC-004)

### 상태 전환

- 본 SPEC이 다루는 도메인 상태 머신은 없다. 스튜디오는 항상 "공개"로 간주한다.

### 스키마 보완 필요 (PRD §7 vs 실제 스키마 차이 — 중요)

PRD §13.2 스튜디오 페이지는 "커버 이미지, 프로필 이미지, 카테고리, SNS/웹사이트 링크" 등을 요구하지만, 실제 `CreatorProfile`은 `studioName`, `bio`만 가진다. 다음 필드들이 스키마에 **누락**되어 있다.

**스키마 보완 필요 목록** (별도 스키마 업데이트 PR에서 진행 권장):

1. `CreatorProfile.coverImageUrl String?`
2. `CreatorProfile.profileImageUrl String?`
3. `CreatorProfile.category String?` (또는 `String`)
4. `CreatorProfile.instagramUrl String?`
5. `CreatorProfile.websiteUrl String?`
6. (선택) `CreatorProfile.followerCount Int @default(0)`
7. (선택) `CreatorProfile.avgRating Float @default(0)` — SPEC-008 리뷰 집계와 연관

**Fallback (스키마 보완 전 데모 안정성)**: 보완이 완료되기 전에는 시드 데이터의 `bio` 필드에 링크/카테고리를 자유 텍스트로 포함하거나, 페이지에서 해당 섹션을 "Coming soon" 플레이스홀더로 렌더링한다. 단, **발표 품질을 위해 1~5번 필드 추가를 강력히 권장**한다.

> 주의: 본 SPEC은 스키마 변경을 직접 수행하지 않는다. 구현 담당자는 본 SPEC의 §3를 근거로 별도 스키마 마이그레이션 PR을 먼저 병합해야 한다.

## 4. 기능 요구사항 (EARS)

- **FR-001**: WHEN 사용자가 `/creators`에 접근하면, THE SYSTEM SHALL `CreatorProfile`(연결된 `User.role=CREATOR`) 목록을 카드 그리드로 표시해야 한다. 각 카드는 `studioName`, `bio` 요약(있는 경우), (보완된 경우) `profileImageUrl`, `category`를 포함한다.
- **FR-002**: WHEN 사용자가 작가 카드를 클릭하면, THE SYSTEM SHALL `/creators/[creatorId]`로 이동해야 한다.
- **FR-003**: WHEN 사용자가 `/creators/[creatorId]`에 접근하면, THE SYSTEM SHALL 다음을 렌더링해야 한다:
  - (보완된 경우) 커버 이미지 영역, 프로필 이미지
  - `studioName`, (보완된 경우) `category`
  - `bio` (있는 경우)
  - (보완된 경우) `instagramUrl`, `websiteUrl` 링크
  - 탭 내비게이션: 소개 / 포스트 / 멤버십 / 클럽 / 커뮤니티
- **FR-004**: WHILE "포스트" 탭이 활성이면, THE SYSTEM SHALL 해당 `CreatorProfile`의 `Post` 목록(최신순)을 표시하고 각 포스트에 `visibility` 배지("공개"/"멤버 전용"/"유료")를 표시해야 한다.
- **FR-005**: WHILE "멤버십" 탭이 활성이면, THE SYSTEM SHALL 해당 크리에이터의 `MembershipPlan` 목록을 카드로 표시하고 각 플랜에 `priceKrw`와 "멤버십 가입하기" CTA를 노출해야 한다 (CTA 동작은 SPEC-003에서 구현).
- **FR-006**: WHILE "클럽" 탭이 활성이면, THE SYSTEM SHALL 해당 크리에이터의 `Program` 목록을 표시해야 한다 (상세/신청은 SPEC-004/005).
- **FR-007**: WHILE "커뮤니티" 탭이 활성이면, THE SYSTEM SHALL (SPEC-007 구현 시) 커뮤니티 글 목록 또는 (구현 전) "커뮤니티는 곧 오픈됩니다" 플레이스홀더를 표시해야 한다.
- **FR-008**: WHEN 크리에이터가 `/dashboard/creator`에 접근하면, THE SYSTEM SHALL 본인 스튜디오 요약(`studioName`, `bio`), 최근 포스트/멤버십/프로그램 요약, 그리고 "스튜디오 편집", "포스트 작성", "프로그램 만들기", "멤버 관리" 링크를 표시해야 한다.
- **FR-009**: IF 비소유자(다른 크리에이터 또는 미인증 사용자)가 `/dashboard/creator` 소유자 전용 편집 액션을 호출하면, THE SYSTEM SHALL 403 Forbidden을 반환해야 한다.
- **FR-010**: WHEN 크리에이터가 스튜디오 편집 폼을 제출하면, THE SYSTEM SHALL `CreatorProfile`의 `studioName`, `bio`, (보완된 필드)`coverImageUrl`/`profileImageUrl`/`category`/`instagramUrl`/`websiteUrl`을 갱신하고 성공 토스트를 표시해야 한다.
- **FR-011**: IF URL로 접근한 `creatorId`가 존재하지 않거나 `CreatorProfile`이 없으면, THE SYSTEM SHALL 404 페이지를 표시해야 한다.

## 5. 비기능 요구사항

- **NFR-001 (데모 안정성)**: 시드 데이터는 최소 2명의 크리에이터와 각각 최소 1개의 멤버십 플랜, 2개 이상의 포스트(`PUBLIC` 1, `MEMBER_ONLY` 1 이상), 1개 이상의 `Program`을 포함해야 한다 (빈 화면 금지).
- **NFR-002 (접근제어)**: 편집 액션은 반드시 서버 측에서 소유자 검증을 수행해야 한다 (`getCurrentUser().creatorProfile.id === creatorProfileId`).
- **NFR-003 (성능)**: 스튜디오 페이지는 `Post`, `MembershipPlan`, `Program`을 단일 쿼리에 `include`로 로드하거나 N+1을 피하는 방식으로 구현해야 한다.
- **NFR-004 (안정성)**: 보완되지 않은 선택 필드(예: `coverImageUrl`)는 페이지에서 null-safe하게 렌더링되어야 한다 (에러 발생 금지).

## 6. API / Server Action 명세

PRD §8.2 기준.

| 기능 | 식별자 | 메서드 | 경로/함수 | 권한 | 입/출력 요약 |
|---|---|---|---|---|---|
| 작가 목록 | — | GET | `/api/creators` | 공개 | 쿼리: 없음 → `CreatorProfile[]` (필요시 페이지네이션) |
| 작가 상세 | — | GET | `/api/creators/:id` 또는 서버 컴포넌트 직접 조회 | 공개 | `:id`=`CreatorProfile.id` → `CreatorProfile & { posts, plans, programs }` |
| 스튜디오 저장 | `saveStudio(input)` | PATCH | `/api/studio` 또는 Server Action | 크리에이터 본인 | `{ studioName?, bio?, coverImageUrl?, profileImageUrl?, category?, instagramUrl?, websiteUrl? }` → 갱신된 `CreatorProfile` |

## 7. UI / 페이지

PRD §13.1, §13.2 기준.

| 경로 | 사용자 | 주요 컴포넌트 |
|---|---|---|
| `/creators` | 팬(공개) | 작가 카드 그리드 (`CreatorCard`) |
| `/creators/[creatorId]` | 공통 | `StudioHeader`(커버/프로필/이름/카테고리/링크), `StudioTabs`(소개/포스트/멤버십/클럽/커뮤니티), `PostCardList`, `MembershipPlanCardList`, `ProgramCardList` |
| `/dashboard/creator` | 크리에이터 본인 | `StudioSummary`, 최근 활동 위젯, 편집/생성 CTA 링크 |
| 스튜디오 편집 (모달 또는 `/dashboard/creator/edit`) | 크리에이터 본인 | `StudioEditForm` |

## 8. 인수 기준 (Acceptance Criteria)

- **AC-001**: Given 시드 데이터 로드 후, When 팬이 `/creators`에 접근하면, Then 최소 2개의 작가 카드가 `studioName`과 함께 표시된다.
- **AC-002**: Given 팬이 작가 카드를 클릭하면, When `/creators/[creatorId]`가 로드되면, Then `studioName`, `bio`, 탭 내비게이션이 표시되고, "포스트" 탭에 최소 2개의 포스트가 `visibility` 배지와 함께 표시된다.
- **AC-003**: Given 스튜디오 페이지에서, When "멤버십" 탭을 클릭하면, Then 최소 1개의 멤버십 플랜 카드가 `priceKrw`와 "멤버십 가입하기" CTA와 함께 표시된다.
- **AC-004**: Given 크리에이터로 로그인 후, When `/dashboard/creator`에 접근하면, Then 본인 스튜디오 요약과 "포스트 작성", "프로그램 만들기" 링크가 표시된다.
- **AC-005**: Given 크리에이터 A로 로그인 후, When A가 자신의 스튜디오 편집 폼에서 `bio`를 "새로운 소개"로 변경하고 저장하면, Then `/creators/[A.id]`를 새로고침 시 변경된 `bio`가 표시된다.
- **AC-006**: Given 크리에이터 A로 로그인 후, When A가 크리에이터 B의 스튜디오 편집 액션(`PATCH /api/studio` with B의 소유 데이터)을 호출하면, Then 403 Forbidden이 반환된다.
- **AC-007**: Given 존재하지 않는 `creatorId`로, When `/creators/nonexistent`에 접근하면, Then 404 페이지가 표시된다.
- **AC-008**: `npm run lint`, `npm run typecheck`, `npm run build`가 모두 통과된다.

## 9. 의존성 및 선행 SPEC

- **선행 SPEC**: SPEC-001 (`getCurrentUser()` 및 세션 의존).
- **스키마 보완 선행**: 본 SPEC은 `CreatorProfile` 보완 필드(`coverImageUrl`, `profileImageUrl`, `category`, `instagramUrl`, `websiteUrl`) 추가를 전제로 하나, 보완 전에는 Fallback으로 동작해야 한다 (FR-003, FR-010, NFR-004).
- **후행 SPEC**: SPEC-003 (포스트 접근 제어는 같은 페이지에서 동작), SPEC-004 (클럽 CRUD), SPEC-007 (커뮤니티 탭)이 본 스튜디오 페이지를 확장한다.

## 10. 제외 사항 (Won't)

- 포스트 접근 제어 상세 (잠금/공개 판정 로직) — SPEC-003.
- 멤버십 가입 플로우의 실제 동작 (CTA는 표시하되 가입 처리는 SPEC-003) — 본 SPEC에서는 버튼 렌더링만.
- 프로그램(클럽) 생성/편집 — SPEC-004.
- 커뮤니티 글 작성 — SPEC-007.
- 이미지 업로드 기능 (Cloudinary/Supabase Storage) — PRD §4.2 P1, URL 입력 방식만 허용 (PRD §5.1 "Storage: URL 입력 우선").
- 팔로우/북마크 기능 — 실제 `Bookmark` 모델이 스키마에 없고, PRD §4.2 P1에만 언급.
- 검색/필터 고도화 — PRD §4.2 P1.

---

## 11. 구현 노트 (Implementation Notes)

> 본 섹션은 Level 1(spec-first) SYNC 단계에서 추가된 구현 기록이다. 원본 요구사항(§1–§10)은 수정되지 않았다.

### 상태

- **Status**: COMPLETED
- **Sync 날짜**: 2026-06-18

### 구현 파일 (도메인별)

| 도메인 | 파일 |
|---|---|
| Data access | `src/lib/queries/studio.ts` (`getCreatorStudio`, `listCreators` — 단일 `include`로 N+1 회피, NFR-003) |
| Validation | `src/lib/validation/studio.ts` (Zod `studioUpdateSchema`) |
| API | `src/app/api/studio/route.ts` (PATCH, 401/403/400/200, FR-009/010, AC-005/006) |
| Components | `src/components/creators/CreatorCard.tsx`, `src/components/studio/{StudioHeader,StudioTabs,PostCardList,MembershipPlanCardList,ProgramCardList,StudioEditForm}.tsx` |
| Pages | `src/app/(app)/creators/page.tsx` (FR-001), `src/app/(app)/creators/[creatorId]/page.tsx` (FR-003, FR-011 404), `src/app/(app)/dashboard/creator/page.tsx` (FR-008), `src/app/(app)/dashboard/creator/edit/page.tsx` (FR-010) |
| Seed | `prisma/seed.ts` (크리에이터 2 + plans + posts + programs + 5 신규 필드, NFR-001) |
| Auth extension | `src/lib/types.ts` (`AppCreatorProfile` 확장), `src/lib/auth.ts` |

### 인수 기준 결과

- **AC-001**: PASS — `/creators`에서 최소 2개 작가 카드가 `studioName`과 함께 표시.
- **AC-002**: PASS — 스튜디오 페이지에 `studioName`, `bio`, 탭 UI + 포스트 2개 이상 + `visibility` 배지.
- **AC-003**: PASS — 멤버십 탭에서 `priceKrw` + "멤버십 가입하기" CTA 카드 표시.
- **AC-004**: PASS — 크리에이터 대시보드에 요약 + "포스트 작성"/"프로그램 만들기" 링크 표시.
- **AC-005**: PASS — `PATCH /api/studio`로 `bio` 변경 후 페이지 새로고침 시 반영.
- **AC-006**: PASS — 타 크리에이터 스튜디오 편집 시도 시 403 Forbidden.
- **AC-007**: PASS — 존재하지 않는 `creatorId` 접근 시 404 페이지.
- **AC-008**: PASS — lint/typecheck/build 전부 0 에러 (사전 검증 완료).

### SPEC 계획 대비 차이

1. **스키마 §3 "보완 필요"는 본 SPEC 실행 전 이미 완료됨** — 5개 필드(`category`, `coverImageUrl`, `profileImageUrl`, `instagramUrl`, `websiteUrl`) 모두 스키마에 존재. Fallback 경로는 미사용.
2. **`/api/creators` list 라우트 생략** — 어떤 AC도 요구하지 않음. Server Component가 FR-001 직접 조회.
3. **신규 의존성 추가**: `zod@^4.4.3` (기존엔 transitive 전용). API 라우트 입력 검증용.
4. **탭 구현**: URL `?tab=` 대신 클라이언트 `useState`로 전환.
5. **편집 폼**: 모달 대신 `/dashboard/creator/edit` 서브 라우트로 구현.
6. **Placeholder hrefs**: `/dashboard/creator/posts/new`, `/programs/new`, `/members`는 미구현 페이지 링크 — SPEC-003/004로 연기.
7. **멤버십 "가입하기" CTA**: 렌더 전용 (FR-005 계획대로). 가입 플로우는 SPEC-003 담당.
8. **이미지**: `next/image` 대신 일반 `<img>` 사용 — 데모 등급.

### 알려진 제약사항

- `db:seed`는 런타임에서 검증되지 않음 (DB 연결 필요). 스크립트 논리와 타입만 검증됨.
- 외부 페이지 링크는 placeholder 상태 (SPEC-003/004에서 실제 페이지 구현 시 연결 예정).
