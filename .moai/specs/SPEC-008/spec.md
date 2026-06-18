# SPEC-008: 프로그램 완료 처리 및 리뷰

## 1. 개요

- **목적**: 크리에이터 또는 팬의 완료 승인으로 `Program`을 `COMPLETED` 상태로 전환하고, `Payment.status=RELEASED` + `Settlement.status=RELEASED` 정산 릴리스를 수행하며, 팬(및 선택적으로 크리에이터)이 리뷰를 1회 작성할 수 있게 한다. 크리에이터 프로필에 평점/리뷰를 표시한다.
- **배경**: PRD §3.1 데모 플로우 step 15 ("프로그램 완료 처리 후 리뷰를 작성한다"), step 17 ("크리에이터 프로필의 평점/리뷰를 보여준다"); §3.2 최소 성공선 item 8 ("결제 Mock 또는 sandbox 상태 전환 후 리뷰 작성"); §4.1 P0 "리뷰"(완료 후 별점/텍스트, 1회 작성, 수정 불가); §7 Review 모델(초안); §8.8 완료 승인/리뷰 API; §14.1 Program COMPLETED 전환, §14.3 Payment RELEASED 전환; Task 11; §15.1 "완료 후 리뷰 작성 가능".
- **범위**:
  - **포함**: 완료 승인 액션(`Program.status=COMPLETED` + 결제/정산 릴리스), 리뷰 작성(평점 1~5, 코멘트), 1인 1회 제한, 크리에이터 프로필 평점/리뷰 표시, 완료 요청 알림.
  - **제외**: 리뷰 수정/삭제(PR §4.1 "수정 불가"), 크리에이터→팬 리뷰(선택 — 본 SPEC은 팬→크리에이터 우선, 양방향은 선택 보완), 상호 평가 고도화, 태그 기반 집계(P1).

## 2. 사용자 스토리

- As a **크리에이터**, I want **프로그램을 완료 처리**하고, so that **정산이 릴리스되고 참여자가 리뷰를 작성할 수 있다**.
- As a **팬 참여자**, I want **완료된 프로그램에 대해 평점과 코멘트로 리뷰**를 작성하고, so that **크리에이터에 대한 평가를 남길 수 있다**.
- As a **팬 참여자**, I want **리뷰를 한 번만 작성**할 수 있고, so that **중복 평가가 방지된다**.
- As a **방문자/팬**, I want **크리에이터 프로필에 평균 평점과 리뷰 목록**을 보고, so that **참여를 결정할 수 있다**.

## 3. 관련 모델 및 상태

### 관련 Prisma 모델 (실제 `prisma/schema.prisma` 기준)

- **`Program`**: `status ProgramStatus`(SPEC-004 보완 전제). `COMPLETED` 전환 대상.
- **`ProgramApplication`**: 리뷰 자격 판정 — `status=ACCEPTED` + 결제 완료인 신청자만 리뷰 작성 가능.
- **`Contract`** / **`Payment`** / **`Settlement`**: 완료 승인 시 `Payment.status=RELEASED`, `Settlement.status=RELEASED` 전환.
- **`Review`** (`reviews`):
  - 실제 스키마: `id`, `programId`, `userId`, `rating Int`, `comment String?`, `createdAt`. 관계: `program Program`, `user User`. `@@index([programId])`.
  - **스키마 갭 (완화됨)**: PRD §7은 `reviewerId`, `revieweeId`, `text`, `tags String[]`, `@@unique([programId, reviewerId])`를 정의. 실제는 `userId`(작성자), `comment`, `rating`만 있다. 본 SPEC은 실제 스키마를 따른다:
    - 작성자: `userId` (리뷰어). `revieweeId` 없음 → **팬→크리에이터 방향만 지원** (양방향/상호 평가는 `revieweeId` 추가 시 확장).
    - 중복 방지: 실제 스키마에 unique 제약 **없음** → **스키마 보완 필요** 또는 애플리케이션에서 사전 체크.
    - `tags`: 누락 → 본 SPEC은 평점+코멘트만 요구.
- **`CreatorProfile`**: `avgRating`이 실제 스키마에 없음 → **선택 보완**(또는 런타임 집계).
- **`Notification`**: `type="REVIEW_REQUESTED"`로 리뷰 요청 알림 (문자열 타입).

### 스키마 보완 필요

1. **(필수) Review 중복 방지**: `@@unique([programId, userId])` 제약 추가 (PRD §7 기준, 1인 1회 강제). 애플리케이션 사전 체크만으로는 레이스 컨디션 위험이 있으므로 DB 제약 권장.

2. **(선택) 양방향 리뷰**: `Review.revieweeId String?` 추가 (크리에이터→팬 리뷰 지원 시). 본 SPEC은 팬→크리에이터만 필수로 요구.

3. **(선택) Review.tags String[]**: 태그 기반 리뷰 집계가 필요한 경우. 본 SPEC은 평점+코멘트만.

4. **(선택) CreatorProfile.avgRating Float**: 사전 집계 캐시. 없으면 런타임에 `Review.rating` 평균을 계산(성능 트레이드오프, MVP에서는 런타임 집계 허용).

5. **(선택) NotificationType "REVIEW_REQUESTED"**: 이미 `type String`이므로 즉시 사용 가능. (별도 보완 불필요.)

### 상태 전환 (PRD §14.1, §14.3)

- `Program`: `IN_PROGRESS → COMPLETED` (완료 승인 시)
- `Payment`: `PAID → RELEASED` (완료 승인과 동시)
- `Settlement`: `PENDING → RELEASED` (완료 승인과 동시)
- 리뷰: 상태 머신 없음. 작성 1회 후 변경 불가(수정/삭제 금지).

## 4. 기능 요구사항 (EARS)

### 완료 승인 및 정산 릴리스

- **FR-001**: WHEN 크리에이터가 `status=IN_PROGRESS`인 본인 프로그램에서 "완료 처리" 액션을 호출하면, THE SYSTEM SHALL 단일 트랜잭션에서 다음을 수행해야 한다:
  - `Program.status=COMPLETED`
  - 해당 프로그램의 모든 `ACCEPTED` + 결제 완료(`Payment.status=PAID`)인 신청자의 `Payment.status=RELEASED`
  - 해당 `Payment`에 연결된 `Settlement.status=RELEASED`
- **FR-002**: WHEN 완료 처리가 완료되면, THE SYSTEM SHALL 각 참여자(결제 완료 팬)에게 `type="REVIEW_REQUESTED"` `Notification`을 생성해야 한다.
- **FR-003**: IF 비소유 크리에이터 또는 팬이 완료 처리 액션을 호출하면, THE SYSTEM SHALL 403을 반환해야 한다.
- **FR-004**: IF 프로그램 `status !== IN_PROGRESS`이면, THE SYSTEM SHALL 완료 처리를 거부하고 400을 반환해야 한다.

### 리뷰 작성

- **FR-005**: WHEN 권한 참여자(해당 `Program`에 대해 `status=ACCEPTED` + 결제 완료 `Payment`)가 리뷰 작성 폼(`rating` 1~5, `comment?`)을 제출하면, THE SYSTEM SHALL 새 `Review(programId, userId=참여자, rating, comment)`를 생성해야 한다.
- **FR-006**: IF 동일 `(programId, userId)`에 이미 `Review`가 존재하면, THE SYSTEM SHALL 재작성을 거부하고 409를 반환해야 한다 (또는 폼에서 이미 작성됨 표시).
- **FR-007**: IF `rating`이 1~5 범위를 벗어나면, THE SYSTEM SHALL 검증 에러를 반환해야 한다.
- **FR-008**: IF 프로그램 `status !== COMPLETED`이면, THE SYSTEM SHALL 리뷰 작성을 거부하고 400을 반환해야 한다.
- **FR-009**: IF 미결제 참여자 또는 비참여자가 리뷰 작성을 시도하면, THE SYSTEM SHALL 403을 반환해야 한다.
- **FR-010**: THE SYSTEM SHALL 리뷰의 수정과 삭제를 허용하지 않아야 한다 (PRD §4.1 "수정 불가"). 본 SPEC은 관련 액션을 제공하지 않는다.

### 리뷰 표시

- **FR-011**: WHEN 사용자가 `/creators/[creatorId]` 또는 프로그램 상세(`/programs/[id]`)에 접근하면, THE SYSTEM SHALL 해당 크리에이터(또는 프로그램)의 `Review` 목록과 평균 평점을 표시해야 한다.
- **FR-012**: THE SYSTEM SHALL 크리에이터의 평균 평점을 `Review.rating`의 산술 평균(소수점 1자리 반올림)으로 계산해야 한다. 리뷰가 없으면 평점을 표시하지 않거나 "리뷰 없음"으로 표시한다.

## 5. 비기능 요구사항

- **NFR-001 (트랜잭션)**: FR-001의 완료 승인 트랜잭션은 원자적이어야 하며, 부분 실패 시 전체 롤백된다.
- **NFR-002 (권한)**: 완료 처리와 리뷰 자격 판정은 서버에서 수행된다.
- **NFR-003 (무결성)**: 1인 1회 리뷰는 DB unique 제약(`@@unique([programId, userId])`)으로 보장되어야 한다 (보완 전제). 보완 전에는 사전 쿼리로 체크하되 레이스 컨디션 가능성을 문서에 명시.
- **NFR-004 (데모 안정성)**: 시드는 1개의 `COMPLETED` 프로그램 + 1~2개의 `Review`를 포함해 크리에이터 프로필 평점 표시가 빈 상태로 시작하지 않도록 한다.
- **NFR-005 (수정 불가)**: 리뷰 수정/삭제 액션은 API/UI 어디에도 노출되지 않는다.

## 6. API / Server Action 명세

PRD §8.8 기준.

| 기능 | 식별자 | 메서드 | 경로/함수 | 권한 | 입/출력 요약 |
|---|---|---|---|---|---|
| 완료 승인 | `completeProgram` | POST | `/api/programs/:id/complete` 또는 `/api/contracts/:id/approve` (다중 참여자는 프로그램 단위 권장) 또는 Server Action | 크리에이터 본인 | → `{ programStatus, releasedPayments, releasedSettlements, notifiedParticipants }` |
| 리뷰 작성 | `createReview` | POST | `/api/programs/:id/reviews` 또는 Server Action | 결제 완료 참여자 | `{ rating: 1..5, comment? }` → `Review` |
| 프로그램 리뷰 목록 | — | GET | `/api/programs/:id/reviews` 또는 서버 컴포넌트 | 공개 | → `Review[]`(user 이름 포함) + `avgRating` |
| 크리에이터 리뷰 집계 | `getCreatorRating(creatorProfileId)` | — | 서버 유틸/컴포넌트 | 공개 | → `{ avg: Float \| null, count: Int }` |

## 7. UI / 페이지

PRD §13.1 기준.

| 경로 | 사용자 | 주요 컴포넌트 |
|---|---|---|
| `/dashboard/creator/programs/[id]` (또는 상세) | 크리에이터 본인 | `CompleteButton`(`status=IN_PROGRESS`일 때만 활성) |
| `/programs/[id]` 리뷰 영역 | 공개 | `ReviewList`, `AvgRating` (리뷰 없으면 "아직 리뷰가 없습니다") |
| `/programs/[id]` 리뷰 작성 | 결제 완료 참여자(`COMPLETED` 후) | `ReviewForm`(별점 1~5, 코멘트), 이미 작성 시 "리뷰 작성 완료" 메시지 |
| `/creators/[creatorId]` 소개 탭 또는 별도 섹션 | 공개 | `CreatorRatingSummary`(평균 평점, 리뷰 수), 최근 리뷰 미리보기 |

## 8. 인수 기준 (Acceptance Criteria)

- **AC-001**: Given 크리에이터 A의 `IN_PROGRESS` 프로그램 P에 결제 완료 참여자 F1, F2가 있을 때, When A가 "완료 처리"를 호출하면, Then 단일 트랜잭션에서 `P.status=COMPLETED`, F1과 F2의 `Payment.status=RELEASED`, 대응 `Settlement.status=RELEASED`로 전환되고 F1, F2에게 `"REVIEW_REQUESTED"` 알림이 생성된다.
- **AC-002**: Given 비소유 크리에이터 B, When B가 A의 프로그램 완료 처리를 호출하면, Then 403이 반환된다.
- **AC-003**: Given `RECRUITING` 또는 `CONTRACTING` 상태 프로그램, When 완료 처리를 호출하면, Then 400이 반환된다.
- **AC-004**: Given 완료 처리 중 `Settlement` 갱신이 실패하면, When 트랜잭션이 종료되면, Then `Program.status`와 모든 `Payment.status` 갱신이 롤백된다.
- **AC-005**: Given F1이 완료된 P에 대해 결제 완료 참여자, When F1이 `rating=5, comment="좋았습니다"`로 리뷰를 제출하면, Then `Review(programId=P, userId=F1, rating=5, comment="좋았습니다")`가 생성된다.
- **AC-006**: Given F1이 이미 P에 리뷰를 작성한 상태, When F1이 다시 작성을 시도하면, Then 409(또는 폼 "이미 작성됨")가 반환되고 새 레코드가 생성되지 않는다.
- **AC-007**: Given `rating=0` 또는 `rating=6` 입력, When 제출하면, Then 검증 에러가 반환된다.
- **AC-008**: Given P가 아직 `IN_PROGRESS`, When F1이 리뷰 작성을 시도하면, Then 400이 반환된다.
- **AC-009**: Given 미결제 참여자 또는 비참여자, When 리뷰 작성을 시도하면, Then 403이 반환된다.
- **AC-010**: Given P에 리뷰 2개(rating 4, 5)가 있을 때, When 사용자가 `/programs/[id]` 리뷰 영역을 보면, Then 평균 평점 "4.5"와 리뷰 2개가 표시된다.
- **AC-011**: Given 크리에이터 A가 프로그램 2개에서 총 3개 리뷰(rating 5, 4, 3)를 받은 경우, When A의 `/creators/[id]` 페이지를 조회하면, Then 평균 평점 "4.0"과 리뷰 수 "3"이 표시된다.
- **AC-012**: Given 리뷰가 없는 크리에이터, When 프로필을 조회하면, Then 평점이 표시되지 않거나 "리뷰 없음"으로 표시된다 (에러 발생 금지).
- **AC-013**: Given 작성된 리뷰, When 어떤 사용자(작성자 포함)도 수정/삭제 액션을 시도하면, Then 해당 액션이 존재하지 않거나 405/403을 반환한다 (리뷰 불변).
- **AC-014**: `npm run lint`, `npm run typecheck`, `npm run build`가 통과된다.

## 9. 의존성 및 선행 SPEC

- **선행 SPEC**: SPEC-001, SPEC-004 (`Program.status`, 보완 전제), SPEC-005 (`ACCEPTED` 참여자), SPEC-006 (`PAID` 결제, `Settlement`), SPEC-007 (참여자 명단).
- **스키마 보완 선행 (필수)**: `Review` 모델에 `@@unique([programId, userId])` 제약 추가. `Program` 보완(SPEC-004)도 선행.
- **스키마 보완 (선택)**: 양방향 리뷰(`revieweeId`), 태그(`tags`), 평점 캐시(`CreatorProfile.avgRating`).
- **후행 SPEC**: 없음 (최종 데모 플로우 종점).

## 10. 제외 사항 (Won't)

- 리뷰 수정 및 삭제 — PRD §4.1 "수정 불가".
- 크리에이터→팬 리뷰 — `revieweeId` 보완 시 별도 확장. 본 SPEC은 팬→크리에이터만 필수.
- 신고/모더레이션, 부적절 리뷰 숨김 — MVP 밖.
- 태그 기반 리뷰 집계 / 키워드 클라우드 — PRD §4.2 P1.
- 리뷰에 사진/미디어 첨부 — URL 입력도 본 SPEC 범위 밖.
- 평점 조작 방지(작성자 익명화, 검증 로직) — MVP 데모 범위 밖.
- 자동 완료 처리(기간 종료 후 자동 `COMPLETED`) — 본 SPEC은 명시적 승인만 다룸. 자동화는 별도 스케줄러 SPEC 필요.
