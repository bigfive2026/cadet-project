# SPEC-005: 팬 참여 신청·수락/거절 및 알림

## 1. 개요

- **목적**: 팬이 프로그램에 참여 신청하고, 크리에이터가 이를 수락/거절하며, 관련 인앱 알림이 자동 생성되는 흐름을 구현한다. PRD의 RFP "Application/지원 수락·거절"에 대응한다.
- **배경**: PRD §3.2 최소 성공선 items 6, 7 ("팬의 참여 신청", "크리에이터의 수락/거절 + 알림"); §4.1 P0 "팬 신청", "수락/거절", "알림"; §6 "ProgramApplication: RFP의 Application 대응"; §8.5 Application API; §8.6 Notification API; §14.2 Application 상태; Task 07; §15.1 "크리에이터가 신청을 수락/거절 가능", "팬에게 알림이 생성되고 읽음 처리 가능".
- **범위**:
  - **포함**: 팬 참여 신청 생성(중복 방지), 크리에이터 신청 목록 조회, 수락/거절 액션(트랜잭션), 자동 거절 옵션(`AUTO_REJECTED`), `Notification` 레코드 생성(신청/수락/거절/자동거절/마감), 알림 목록 페이지, 헤더 미읽음 배지, 읽음 처리.
  - **제외**: 계약/결제(SPEC-006), 환불 알림(환불 Won't), 이메일/푸시 알림(인앱만 — §4.1 "인앱 알림만 구현").

## 2. 사용자 스토리

- As a **팬**, I want **프로그램 상세에서 참여 신청 버튼을 클릭**하고, so that **크리에이터에게 내 신청이 전달된다**.
- As a **팬**, I want **동일 프로그램에 중복 신청이 차단**되고, so that **실수로 여러 번 신청되지 않는다**.
- As a **크리에이터**, I want **내 프로그램의 신청 목록을 보고 수락/거절**할 수 있고, so that **참여자를 확정할 수 있다**.
- As a **팬**, I want **신청/수락/거절/자동거절/마감 이벤트를 인앱 알림으로 받**고, so that **상태 변화를 놓치지 않는다**.
- As a **사용자**, I want **헤더에 미읽음 알림 배지**가 표시되고, 알림을 클릭하면 **자동 읽음** 처리되어 링크로 이동하고, so that **알림을 빠르게 소비할 수 있다**.

## 3. 관련 모델 및 상태

### 관련 Prisma 모델 (실제 `prisma/schema.prisma` 기준)

- **`ProgramApplication`** (`program_applications`):
  - `id`, `programId`, `userId`, `status ProgramApplicationStatus @default(PENDING)`, `message String?`, `createdAt`, `updatedAt`
  - `@@index([programId, status])`, `@@index([userId])`
  - 관계: `program Program`, `user User`, `contract Contract?`
  - **중요 — 스키마 갭**: 실제 `ProgramApplicationStatus` enum은 `PENDING`, `ACCEPTED`, `REJECTED`만 가진다. PRD §14.2가 요구하는 `AUTO_REJECTED`, `CANCELLED`가 **누락**되어 있다.
- **`Notification`** (`notifications`):
  - `id`, `userId`, `type String` (enum 아님 — 자유 텍스트), `message String`, `readAt DateTime?`, `createdAt`
  - `@@index([userId, readAt])`
  - 관계: `user User`
  - **스키마 갭 (완화됨)**: PRD §7은 `NotificationType` enum, `linkUrl String`, `isRead Boolean`을 정의하지만 실제는 `type String`, `readAt DateTime?`를 사용한다. 본 SPEC은 실제 스키마를 따른다:
    - `type`은 문자열 리터럴(`"APPLICATION_CREATED"`, `"APPLICATION_ACCEPTED"`, `"APPLICATION_REJECTED"`, `"APPLICATION_AUTO_REJECTED"`, `"PROGRAM_CLOSED"`)로 사용.
    - 읽음 여부는 `readAt IS NULL`로 판정 (NFR-004에 명시).
    - `linkUrl`이 없으므로 `message` 내에 맥락을 담고, 클릭 시 타입 기반으로 라우팅한다 (또는 `linkUrl` 추가 권장 — 선택 보완).
- **`Program`**: `ProgramApplication`과 연결 (SPEC-004 보완 전제).
- **`User`**: 역할 판정 및 관계.

### 스키마 보완 필요 (필수)

1. `ProgramApplicationStatus` enum에 `AUTO_REJECTED`, `CANCELLED` 값 추가 (PRD §14.2 기준).

```
enum ProgramApplicationStatus {
  PENDING
  ACCEPTED
  REJECTED
  AUTO_REJECTED
  CANCELLED
}
```

### 스키마 보완 (선택 — 데모 품질)

2. `Notification.linkUrl String?` — 클릭 시 이동 경로 저장 (없으면 `type` 기반 라우팅으로 대체 가능).
3. (권장) `NotificationType` enum 도입 — 타입 안정성 확보. (MVP에서는 문자열 리터럴 유니온 타입으로도 충분.)

### 상태 전환 (PRD §14.2)

| 상태 | 의미 | 전환 트리거 |
|---|---|---|
| PENDING | 신청 대기 | 최초 신청 생성 |
| ACCEPTED | 수락 | 크리에이터 수락 액션 |
| REJECTED | 직접 거절 | 크리에이터 거절 액션 |
| AUTO_REJECTED | 정원 마감/타 신청 수락에 따른 자동 거절 | 수락 시 다른 PENDING 자동 거절 (옵션) 또는 모집 마감 |
| CANCELLED | 팬이 취소 | 팬의 취소 액션 (선택 구현) |

## 4. 기능 요구사항 (EARS)

### 참여 신청

- **FR-001**: WHEN 팬이 `status=RECRUITING`인 프로그램에서 "참여 신청" 액션을 호출하면, THE SYSTEM SHALL `(programId, userId)` 쌍으로 새 `ProgramApplication`(`status=PENDING`)을 생성하고 크리에이터에게 `type="APPLICATION_CREATED"` `Notification`을 생성해야 한다.
- **FR-002**: IF 동일 `(programId, userId)`에 이미 `PENDING`/`ACCEPTED` 상태의 신청이 존재하면, THE SYSTEM SHALL 중복 생성을 차단하고 409 Conflict(또는 폼 에러)를 반환해야 한다.
- **FR-003**: IF 프로그램 `status !== RECRUITING`이면(또는 `recruitDeadline` 경과), THE SYSTEM SHALL 신청 생성을 거부하고 400을 반환해야 한다.
- **FR-004**: IF 크리에이터가 자기 프로그램에 신청하면, THE SYSTEM SHALL 이를 거부해야 한다 (자기 참여 금지).

### 수락/거절

- **FR-005**: WHEN 크리에이터가 본인 프로그램의 `PENDING` 신청을 "수락" 액션으로 처리하면, THE SYSTEM SHALL `ProgramApplication.status=ACCEPTED`로 갱신하고 팬에게 `type="APPLICATION_ACCEPTED"` `Notification`을 생성해야 한다. 이 작업은 단일 트랜잭션으로 수행되어야 한다.
- **FR-006**: WHILE 수락 액션이 실행될 때, IF "다른 대기 신청 자동 거절" 옵션이 활성이면, THE SYSTEM SHALL 동일 프로그램의 다른 모든 `PENDING` 신청을 `AUTO_REJECTED`로 전환하고 각 팬에게 `type="APPLICATION_AUTO_REJECTED"` `Notification`을 생성해야 한다 (동일 트랜잭션).
- **FR-007**: WHEN 크리에이터가 본인 프로그램의 `PENDING` 신청을 "거절" 액션으로 처리하면, THE SYSTEM SHALL `ProgramApplication.status=REJECTED`로 갱신하고 팬에게 `type="APPLICATION_REJECTED"` `Notification`을 생성해야 한다.
- **FR-008**: IF 비소유 크리에이터 또는 팬이 수락/거절 액션을 호출하면, THE SYSTEM SHALL 403을 반환해야 한다.
- **FR-009**: IF 이미 `ACCEPTED`/`REJECTED`/`AUTO_REJECTED`/`CANCELLED` 상태인 신청에 대해 상태 변경을 시도하면, THE SYSTEM SHALL 400을 반환해야 한다 (멱등성 위반).

### 모집 마감 알림

- **FR-010**: WHEN 프로그램 `status`가 `CLOSED`로 전환되면 (SPEC-004 FR-005 또는 크리에이터 수동 마감), THE SYSTEM SHALL 해당 프로그램의 모든 `PENDING` 신청자에게 `type="PROGRAM_CLOSED"` `Notification`을 생성해야 한다. (정책에 따라 `AUTO_REJECTED` 전환 포함 — 본 SPEC은 알림만 보장.)

### 알림 UI

- **FR-011**: WHEN 사용자가 `/notifications`에 접근하면, THE SYSTEM SHALL 본인 `Notification` 목록(최신순)을 표시해야 한다. 미읽음 항목은 시각적으로 구분되어야 한다.
- **FR-012**: WHILE 사용자가 로그인된 상태이면, THE SYSTEM SHALL 헤더에 미읽음 알림 개수(`readAt IS NULL`)를 배지로 표시해야 한다.
- **FR-013**: WHEN 사용자가 알림 항목을 클릭하면, THE SYSTEM SHALL `readAt`을 현재 시각으로 설정(읽음 처리)한 뒤, `type`에 따른 링크(또는 `linkUrl`)로 이동해야 한다.
- **FR-014**: WHEN 사용자가 "전체 읽음" 액션을 호출하면, THE SYSTEM SHALL 본인의 모든 미읽음 `Notification`의 `readAt`을 현재 시각으로 일괄 설정해야 한다.

## 5. 비기능 요구사항

- **NFR-001 (트랜잭션)**: 수락/거절/자동거절은 단일 Prisma 트랜잭션(`$transaction`)으로 수행되어야 하며, 중간 실패 시 전체 롤백되어야 한다 (PRD Task 07 "State changes are transaction-safe where possible").
- **NFR-002 (데모 안정성)**: 시드는 최소 1개의 `PENDING` 신청을 포함해야 한다 (수락/거절 데모가 빈 상태로 시작하지 않도록).
- **NFR-003 (권한)**: 모든 신청 처리 액션은 서버에서 `program.creatorProfileId === currentUser.creatorProfile?.id`를 검증해야 한다.
- **NFR-004 (읽음 판정)**: 읽음 여부는 `Notification.readAt IS NULL`(미읽음) / `NOT NULL`(읽음)로 판정한다.
- **NFR-005 (알림 타입 안전성)**: `Notification.type`은 정의된 리터럴 유니온 타입(`"APPLICATION_CREATED" | "APPLICATION_ACCEPTED" | ...`)으로 코드베이스에서 관리되어야 한다 (오타 방지).
- **NFR-006 (범위)**: 이메일, SMS, 푸시, 외부 webhook 알림은 구현하지 않는다 (PRD §4.1 "인앱 알림만").

## 6. API / Server Action 명세

PRD §8.5, §8.6 기준.

| 기능 | 식별자 | 메서드 | 경로/함수 | 권한 | 입/출력 요약 |
|---|---|---|---|---|---|
| 신청 생성 | `applyToProgram` | POST | `/api/programs/:id/applications` 또는 Server Action | 팬 | `{ message? }` → `ProgramApplication` |
| 신청 목록 | — | GET | `/api/programs/:id/applications` | 크리에이터 본인 | → `ProgramApplication[]`(user 포함) |
| 신청 처리 | `processApplication` | PATCH | `/api/applications/:id` | 크리에이터 본인 | `{ action: "accept" \| "reject", autoRejectOthers?: boolean }` → 갱신된 신청 + (자동거절 시) 영향받은 신청 수 |
| 알림 목록 | — | GET | `/api/notifications` 또는 서버 컴포넌트 | 인증됨 | → `Notification[]` |
| 알림 읽음 | `markNotificationRead` | PATCH | `/api/notifications/:id/read` | 인증됨(본인) | → `{ ok: true, readAt }` |
| 전체 읽음 | `markAllNotificationsRead` | PATCH | `/api/notifications/read-all` | 인증됨(본인) | → `{ ok: true, updated: number }` |
| 미읽음 개수 | `getUnreadNotificationCount` | — | 서버 유틸/컴포넌트 | 인증됨 | → `number` |

## 7. UI / 페이지

PRD §13.1 기준.

| 경로 | 사용자 | 주요 컴포넌트 |
|---|---|---|
| `/programs/[id]` "참여 신청" 영역 | 팬 | `ApplyButton` (이미 신청 시 비활성, 메시지 입력 옵션) |
| `/dashboard/creator/programs/[id]/applications` | 크리에이터 본인 | `ApplicationList`(신청자, 메시지, 상태 배지), 행별 수락/거절 버튼, "수락 시 다른 대기 신청 자동 거절" 토글 |
| `/notifications` | 인증됨 | `NotificationList`(타입별 아이콘, 미읽음 하이라이트), "전체 읽음" 버튼 |
| 헤더 (전역 레이아웃) | 인증됨 | `NotificationBell`(미읽음 배지) |

## 8. 인수 기준 (Acceptance Criteria)

- **AC-001**: Given 팬 F, 크리에이터 A의 `RECRUITING` 프로그램 P, When F가 "참여 신청"을 클릭하면, Then `ProgramApplication(programId=P, userId=F, status=PENDING)`이 생성되고 A에게 `type="APPLICATION_CREATED"` 알림이 생성된다.
- **AC-002**: Given F가 이미 P에 `PENDING` 신청을 가지고 있을 때, When F가 다시 신청 액션을 호출하면, Then 409(또는 폼 에러)가 반환되고 새 레코드가 생성되지 않는다.
- **AC-003**: Given P에 팬 F1, F2의 `PENDING` 신청이 있을 때, When A가 F1을 "수락"(자동거절 옵션 ON)하면, Then F1 신청은 `ACCEPTED`, F2 신청은 `AUTO_REJECTED`로 같은 트랜잭션에서 갱신되고 F1에게 `"APPLICATION_ACCEPTED"`, F2에게 `"APPLICATION_AUTO_REJECTED"` 알림이 생성된다.
- **AC-004**: Given A가 F1을 "거절"하면, When 처리가 완료되면, Then F1 신청은 `REJECTED`이고 F1에게 `"APPLICATION_REJECTED"` 알림이 생성된다.
- **AC-005**: Given 크리에이터 B(비소유자)가, When A의 프로그램 신청 처리 액션을 호출하면, Then 403이 반환된다.
- **AC-006**: Given P의 `status`가 `CLOSED`로 전환되면, When 전환이 처리되면, Then P의 모든 `PENDING` 신청자에게 `"PROGRAM_CLOSED"` 알림이 생성된다.
- **AC-007**: Given F에게 미읽음 알림 3개가 있을 때, When F가 `/notifications`에 접근하면, Then 3개의 미읽음 항목이 하이라이트되어 표시되고 헤더 배지에 "3"이 표시된다.
- **AC-008**: Given F가 알림 1개를 클릭하면, When 읽음 처리가 실행되면, Then 해당 알림의 `readAt`이 설정되고 헤더 배지가 "2"로 갱신되며, `type`에 대응하는 링크로 이동한다.
- **AC-009**: Given F가 "전체 읽음"을 클릭하면, When 처리가 완료되면, Then 본인의 모든 미읽음 알림 `readAt`이 일괄 설정되고 헤더 배지가 사라진다.
- **AC-010**: Given 이미 `ACCEPTED`인 신청, When 다시 "수락"을 호출하면, Then 400이 반환된다.
- **AC-011**: Given A가 자기 프로그램 P에, When A가 신청 액션을 호출하면, Then 400(자기 참여 금지)이 반환된다.
- **AC-012**: Given 수락 트랜잭션 도중 알림 생성이 실패하면, When 트랜잭션이 종료되면, Then 전체(신청 상태 갱신 + 자동거절 + 알림)가 롤백된다.
- **AC-013**: `npm run lint`, `npm run typecheck`, `npm run build`가 통과된다.

## 9. 의존성 및 선행 SPEC

- **선행 SPEC**: SPEC-001, SPEC-004 (`Program` 보완 포함).
- **스키마 보완 선행 (필수)**: `ProgramApplicationStatus`에 `AUTO_REJECTED`, `CANCELLED` 추가.
- **후행 SPEC**: SPEC-006 (수락된 신청 → 계약 생성 흐름), SPEC-007 (참여자 명단은 `ACCEPTED` 신청 기반), SPEC-008 (완료/리뷰는 참여자 대상).

## 10. 제외 사항 (Won't)

- 계약 생성 및 결제 — SPEC-006.
- 환불 알림 — PRD §4.3 환불 API 제외.
- 이메일/SMS/푸시 알림 — PRD §4.1 "인앱 알림만".
- 팬의 신청 취소(`CANCELLED`) UX — 상태값은 보완하되, 본 SPEC은 취소 액션을 **필수로 요구하지 않는다** (PRD Task 07이 명시하지 않음; 필요 시 별도 추가).
- 알림 설정/구독 — MVP 범위 밖.
- 알림별 링크 커스터마이징 고도화 — `type` 기반 라우팅으로 충분 (`linkUrl` 보완은 선택).
