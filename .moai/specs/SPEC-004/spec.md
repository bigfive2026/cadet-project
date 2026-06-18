# SPEC-004: 프로그램(클럽) CRUD

## 1. 개요

- **목적**: 크리에이터가 클럽/프로그램(작업shop, 챌린지, 클래스 등)을 생성·조회·수정·삭제(soft)하고, 공개 상세 페이지와 탐색 목록을 제공한다. PRD의 RFP "Project"에 대응한다.
- **배경**: PRD §3.2 최소 성공선 item 5 ("클럽/프로그램 생성 및 상세 표시"); §4.1 P0 "클럽/프로그램 CRUD"; §6 용어 "Program: RFP의 Project 대응"; §7 Program 모델(초안); §8.5 Program API; §13.1 `/programs`, `/programs/[id]`; §14.1 Program 상태; Task 06.
- **범위**:
  - **포함**: 프로그램 생성(크리에이터), 공개 목록(`/programs`), 공개 상세(`/programs/[id]`), 크리에이터 본인 수정, soft delete, 상태(스키마 보완 시), 스튜디오 "클럽" 탭 연동.
  - **제외**: 팬 참여 신청/수락/거절 (SPEC-005), 계약/결제(SPEC-006), 커뮤니티(SPEC-007), 리뷰(SPEC-008), AI 가격 추천(PR §4.2 P1, §8.7 — 별도 SPEC), 검색/필터 고도화(P1).

## 2. 사용자 스토리

- As a **크리에이터**, I want **프로그램을 생성**하고(`title`, `description`, `priceKrw`, 기간, 모집 인원, 모집 마감일), so that **팬이 참여 신청할 수 있다**.
- As a **크리에이터**, I want **내 프로그램 목록과 상태**를 보고 편집하거나 삭제할 수 있고, so that **프로그램 라이프사이클을 관리할 수 있다**.
- As a **팬**, I want **프로그램 탐색 페이지와 상세 페이지**를 보고, so that **참여할 프로그램을 선택할 수 있다**.
- As a **발표자**, I want **새 프로그램을 만든 직후 스튜디오 페이지와 탐색 페이지에 반영**되고, so that **데모 흐름이 끊기지 않는다**.

## 3. 관련 모델 및 상태

### 관련 Prisma 모델 (실제 `prisma/schema.prisma` 기준)

- **`Program`** (`programs`):
  - 실제 스키마: `id`, `creatorProfileId`, `title`, `description String?`, `createdAt`, `updatedAt`. 관계: `creatorProfile`, `applications ProgramApplication[]`, `reviews Review[]`. `@@index([creatorProfileId])`.
  - **중요 — 스키마 보완 필요**: 실제 스키마는 PRD §7/§4.1/§14.1이 요구하는 핵심 필드를 대부분 누락하고 있다.

### 스키마 보완 필요 (필수)

PRD §4.1 "제목, 설명, 가격, 기간, 모집 인원", §14.1 "Program 상태", §8 Task 06 "Program status should support RECRUITING, CLOSED, IN_PROGRESS, COMPLETED"를 충족하려면 다음 보완이 **필수**이다:

1. `Program.priceKrw Int` (또는 `price`) — 가격
2. `Program.category String?` — 카테고리
3. `Program.startDate DateTime? @map("start_date")`
4. `Program.endDate DateTime? @map("end_date")`
5. `Program.recruitDeadline DateTime? @map("recruit_deadline")`
6. `Program.maxParticipants Int? @map("max_participants")`
7. `Program.status ProgramStatus @default(RECRUITING)` — **신규 enum 필요**
8. `Program.deletedAt DateTime? @map("deleted_at")` — soft delete

신규 enum `ProgramStatus` (PRD §14.1 기준):

```
enum ProgramStatus {
  DRAFT
  RECRUITING
  CLOSED
  CONTRACTING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

> 주의: 본 SPEC은 스키마 변경을 직접 수행하지 않는다. 본 SPEC의 FR-004, FR-005, FR-006, FR-009, FR-010과 AC-003, AC-005, AC-006, AC-008은 위 보완이 완료된 것을 전제로 한다. 보완 전에는 `title`, `description`만으로 데모가 가능하도록 Fallback을 허용하되(AC는 보완 후 기준).

### 상태 전환 (PRD §14.1)

| 상태 | 의미 | 전환 조건 |
|---|---|---|
| DRAFT | 작성 중 | 임시 저장 |
| RECRUITING | 모집 중 | 공개 등록 (기본값) |
| CLOSED | 모집 마감 | 마감일 초과 또는 수동 마감 |
| CONTRACTING | 계약 대기 | 팬 신청 수락 (SPEC-005 연동) |
| IN_PROGRESS | 진행 중 | 계약 서명 + 결제 완료 (SPEC-006 연동) |
| COMPLETED | 완료 | 완료 승인 (SPEC-008 연동) |
| CANCELLED | 취소 | 계약 전 취소 |

- 본 SPEC이 직접 다루는 생성/수정 흐름에서는 `DRAFT` ↔ `RECRUITING` ↔ `CLOSED` ↔ `CANCELLED`를 다룬다. `CONTRACTING`/`IN_PROGRESS`/`COMPLETED` 전환은 SPEC-005, SPEC-006, SPEC-008에서 트리거한다.

## 4. 기능 요구사항 (EARS)

- **FR-001**: WHEN 크리에이터가 프로그램 생성 폼(`title`, `description`, `priceKrw`, `category?`, `startDate?`, `endDate?`, `recruitDeadline?`, `maxParticipants?`, 초기 `status`)을 제출하면, THE SYSTEM SHALL 본인 `CreatorProfile`에 연결된 새 `Program`을 생성해야 한다. 기본 `status`는 `RECRUITING`이다.
- **FR-002**: IF 비크리에이터 또는 다른 크리에이터가 생성 액션을 호출하면, THE SYSTEM SHALL 403을 반환해야 한다.
- **FR-003**: WHEN 사용자가 `/programs`에 접근하면, THE SYSTEM SHALL `status=RECRUITING`(또는 `CLOSED`/`IN_PROGRESS` 등 공개 허용 상태)이고 `deletedAt IS NULL`인 `Program` 목록을 카드로 표시해야 한다. `DRAFT`와 `CANCELLED`는 비공개.
- **FR-004**: WHEN 사용자가 `/programs/[id]`에 접근하면, THE SYSTEM SHALL 프로그램 `title`, `description`, `priceKrw`, `category`, 기간(`startDate`~`endDate`), `recruitDeadline`, `maxParticipants`, 현재 `status`, 크리에이터 요약을 표시해야 한다.
- **FR-005**: IF 프로그램 `status=RECRUITING`이고 `recruitDeadline`이 지난 경우, THE SYSTEM SHALL 해당 프로그램을 조회 시 `status=CLOSED`로 자동 전환하거나 "모집 마감"으로 표시해야 한다 (구현 방식: 조회 시 평가 또는 스케줄러 — MVP에서는 조회 시 평가 권장).
- **FR-006**: WHEN 크리에이터가 본인 프로그램을 수정(PATCH)하면, THE SYSTEM SHALL `title`, `description`, `priceKrw`, `category`, 날짜, `maxParticipants`, `status`(허용된 전이만)를 갱신해야 한다.
- **FR-007**: IF 허용되지 않은 상태 전이(예: `COMPLETED` → `RECRUITING`)를 시도하면, THE SYSTEM SHALL 400 Bad Request를 반환해야 한다.
- **FR-008**: WHEN 크리에이터가 본인 프로그램을 삭제(soft)하면, THE SYSTEM SHALL `deletedAt`을 현재 시각으로 설정하고 공개 목록에서 제외시켜야 한다 (실제 레코드 삭제 금지 — PRD Task 06 "삭제는 soft").
- **FR-009**: WHILE 프로그램이 `DRAFT` 상태이면, THE SYSTEM SHALL 공개 목록(`/programs`)과 스튜디오 공개 "클럽" 탭에서 이를 숨겨야 한다 (본인 크리에이터의 대시보드에서는 표시).
- **FR-010**: WHEN 크리에이터 본인이 `/dashboard/creator`의 프로그램 목록을 보면, THE SYSTEM SHALL 본인의 모든 `Program`(`DRAFT` 포함, `deletedAt IS NULL`)을 `status`와 함께 표시해야 한다.
- **FR-011**: IF 존재하지 않거나 soft-deleted된 `Program.id`로 상세 페이지에 접근하면, THE SYSTEM SHALL 404를 반환해야 한다.
- **FR-012**: WHEN 스튜디오 페이지 "클럽" 탭이 로드되면, THE SYSTEM SHALL 해당 크리에이터의 `Program`(공개 상태, `deletedAt IS NULL`)을 표시해야 한다 (SPEC-002와 연동).

## 5. 비기능 요구사항

- **NFR-001 (데모 안정성)**: 시드는 최소 2개의 `Program`(status=`RECRUITING`)을 포함하고, 각각 `priceKrw`, `category`, `recruitDeadline`, `maxParticipants`가 채워져 있어야 한다.
- **NFR-002 (접근제어)**: 수정/삭제 액션은 서버에서 `creatorProfileId === getCurrentUser().creatorProfile?.id`를 검증해야 한다.
- **NFR-003 (무결성)**: 상태 전이는 서버에서 화이트리스트로 검증되어야 한다 (클라이언트가 임의 status를 설정할 수 없음).
- **NFR-004 (성능)**: 공개 목록은 `deletedAt IS NULL AND status IN (...)` 인덱스 활용 쿼리로 로드해야 한다.

## 6. API / Server Action 명세

PRD §8.5 기준.

| 기능 | 식별자 | 메서드 | 경로/함수 | 권한 | 입/출력 요약 |
|---|---|---|---|---|---|
| 프로그램 목록 | — | GET | `/api/programs` | 공개 | 쿼리: `category?`, `status?`(제한) → `Program[]` |
| 프로그램 생성 | `createProgram` | POST | `/api/programs` 또는 Server Action | 크리에이터 본인 | `{ title, description?, priceKrw, category?, startDate?, endDate?, recruitDeadline?, maxParticipants?, status?=RECRUITING }` → `Program` |
| 프로그램 상세 | — | GET | `/api/programs/:id` 또는 서버 컴포넌트 | 공개(soft-delete/DRAFT 제외) | → `Program & { creatorProfile }` |
| 프로그램 수정 | `updateProgram` | PATCH | `/api/programs/:id` | 크리에이터 본인 | 부분 필드 → 갱신된 `Program` |
| 프로그램 삭제 | `deleteProgram` | DELETE | `/api/programs/:id` | 크리에이터 본인 | → `{ ok: true }`, `deletedAt` 설정 |

## 7. UI / 페이지

PRD §13.1 기준.

| 경로 | 사용자 | 주요 컴포넌트 |
|---|---|---|
| `/programs` | 팬(공개) | `ProgramCardGrid` (`ProgramCard`: 제목, 크리에이터, 가격, 모집 상태 배지, 기간) |
| `/programs/[id]` | 공통 | `ProgramDetail`(제목, 설명, 가격, 기간, 모집 인원, 마감일, 상태 배지, 크리에이터 링크). `RECRUITING` 시 "참여 신청" CTA (SPEC-005에서 활성화) |
| `/dashboard/creator/programs` | 크리에이터 본인 | 본인 `Program` 목록(상태 배지), "새 클럽 만들기" CTA, 행별 편집/삭제 |
| `/dashboard/creator/programs/new` | 크리에이터 본인 | `ProgramForm` |
| `/dashboard/creator/programs/[id]/edit` | 크리에이터 본인 | `ProgramForm`(초기값 로드) |

## 8. 인수 기준 (Acceptance Criteria)

- **AC-001**: Given 크리에이터 A로 로그인 후, When A가 `title="4주 드로잉 챌린지"`, `priceKrw=35000`, `maxParticipants=20`, `status=RECRUITING`으로 프로그램을 생성하면, Then DB에 `Program` 레코드가 `creatorProfileId=A.creatorProfile.id`로 저장된다.
- **AC-002**: Given 위에서 생성한 프로그램이 존재할 때, When 팬이 `/programs`에 접근하면, Then 해당 프로그램 카드가 표시된다.
- **AC-003**: Given 팬이 프로그램 카드를 클릭하면, When `/programs/[id]`가 로드되면, Then `title`, `priceKrw`, `maxParticipants`, `status` 배지가 표시된다.
- **AC-004**: Given 비크리에이터(팬)가, When `createProgram`을 호출하면, Then 403이 반환된다.
- **AC-005**: Given 크리에이터 A의 `RECRUITING` 프로그램, When A가 `status=CLOSED`로 PATCH하면, Then 상태가 갱신되고 `/programs`에서 해당 카드가 "모집 마감" 배지로 표시된다 (또는 정책에 따라 비노출).
- **AC-006**: Given `RECRUITING` 프로그램에 `recruitDeadline`이 과거로 설정된 경우, When 사용자가 상세 페이지를 조회하면, Then "모집 마감" 상태로 표시된다.
- **AC-007**: Given 크리에이터 A가 본인 프로그램을 soft-delete하면, When 팬이 해당 `/programs/[id]`에 접근하면, Then 404가 반환된다. (DB 레코드는 `deletedAt`만 설정되고 물리 삭제되지 않음)
- **AC-008**: Given 크리에이터 A가 `DRAFT` 프로그램을 가지고 있을 때, When 팬이 `/programs`에 접근하면, Then 해당 `DRAFT` 프로그램은 표시되지 않는다. A의 대시보드에는 표시된다.
- **AC-009**: Given 허용되지 않은 전이(`COMPLETED` → `RECRUITING`), When A가 시도하면, Then 400이 반환된다.
- **AC-010**: Given 크리에이터 B가, When A의 프로그램을 수정하려 하면, Then 403이 반환된다.
- **AC-011**: `npm run lint`, `npm run typecheck`, `npm run build`가 통과된다.

## 9. 의존성 및 선행 SPEC

- **선행 SPEC**: SPEC-001, SPEC-002 (스튜디오 "클럽" 탭 호스트).
- **스키마 보완 선행 (필수)**: `Program` 모델에 `priceKrw`, `category`, `startDate`, `endDate`, `recruitDeadline`, `maxParticipants`, `status ProgramStatus`, `deletedAt` 추가 + `ProgramStatus` enum 신설. 보완 PR이 본 SPEC 구현 전에 병합되어야 한다.
- **후행 SPEC**: SPEC-005 (참여 신청은 본 SPEC의 `Program`에 의존), SPEC-006 (계약은 본 SPEC의 `priceKrw` 참조), SPEC-008 (완료/리뷰는 본 SPEC의 `status=COMPLETED` 사용).

## 10. 제외 사항 (Won't)

- 팬 참여 신청/수락/거절 흐름 — SPEC-005.
- 계약 생성/결제 — SPEC-006.
- AI 가격/혜택 추천 (`/api/programs/ai-suggest`) — PRD §8.7, §4.2 P1 (별도 SPEC 권장).
- 검색/필터/정렬 고도화 — PRD §4.2 P1.
- 추천 프로그램 — PRD §4.2 P1.
- 카테고리 사전 정의/관리 — 본 SPEC은 `category`를 자유 문자열로 처리.
- 멤버/참여자 명단 관리 — SPEC-007.
- 프로그램 이미지 업로드 — URL 입력만 (PRD §5.1).
