# SPEC-007: 커뮤니티 및 멤버 관리

## 1. 개요

- **목적**: 크리에이터 커뮤니티(멤버/참여자 전용 글 목록·작성)와 크리에이터의 멤버/참여자 명단 관리 기능을 구현한다. 활성 멤버십 또는 수락+결제 완료 프로그램 참여자만 접근할 수 있다.
- **배경**: PRD §3.1 데모 플로우 step 13 ("결제 완료 후 팬은 멤버/참여자 전용 콘텐츠와 커뮤니티에 접근"); §3.2 item 7 (참여/수락 후 커뮤니티 접근은 간접 포함); §4.1 P0 "커뮤니티", "멤버 관리 상세"(P1이나 기본 명단은 P0); §13.1, §13.2 (커뮤니티 탭); §8.3 "멤버 목록"; Task 10; §15.1 "커뮤니티 접근 제어가 동작".
- **범위**:
  - **포함**: `CommunityPost` 모델(스키마 보완 필수), 커뮤니티 글 목록/작성, 접근 제어(활성 멤버 OR 결제 완료 참여자), 크리에이터 멤버 명단(활성 `Membership`), 참여자 명단(`ACCEPTED` + 결제 완료 `ProgramApplication`), 비멤버 격벽(CTA 표시).
  - **제외**: 댓글/좋아요(PR §4.1 "댓글은 선택"), 실시간 채팅(Won't), 멤버 활동 이력 상세(P1), 이미지 업로드(URL만), 추방/차단 관리(MVP 밖).

## 2. 사용자 스토리

- As a **활성 멤버/참여자**, I want **커뮤니티 글 목록을 보고 글을 작성**할 수 있고, so that **같은 크리에이터와 연결된 팬들과 소통할 수 있다**.
- As a **비멤버 팬**, I want **커뮤니티에 접근하면 가입/참여 CTA를 보**고, so that **커뮤니티 접근 권한을 얻기 위한 다음 단계를 알 수 있다**.
- As a **크리에이터**, I want **내 스튜디오의 활성 멤버와 프로그램 참여자 명단**을 보고, so that **후원자/참여자를 관리할 수 있다**.
- As a **크리에이터**, I want **커뮤니티 글을 자유롭게 작성**할 수 있고, so that **멤버에게 공지/소통을 전달할 수 있다**.

## 3. 관련 모델 및 상태

### 관련 Prisma 모델 (실제 `prisma/schema.prisma` 기준)

- **`Membership`**: 활성 멤버 판정 (SPEC-003과 동일 — 레코드 존재 = 활성). `userId`, `planId` → `plan.creatorProfileId`로 크리에이터 역참조.
- **`MembershipPlan`**: `creatorProfileId`로 멤버십이 어느 크리에이터 소속인지 판정.
- **`ProgramApplication`**: `status=ACCEPTED` + 결제 완료(`Contract.payments` 중 `status=PAID`/`RELEASED`) → "참여자" 판정. `program.creatorProfileId`로 크리에이터 역참조.
- **`Program`**, **`Contract`**, **`Payment`**: 참여자 판정용 조인.
- **`User`**, **`CreatorProfile`**: 역할/소유자 판정.

### 스키마 보완 필요 (필수)

**`CommunityPost` 모델이 실제 스키마에 완전히 누락**되어 있다. PRD §7 초안에 정의되어 있으므로 신규 생성이 필요하다.

권장 스키마:

```prisma
model CommunityPost {
  id               String   @id @default(cuid())
  creatorProfileId String   @map("creator_profile_id")
  authorId         String   @map("author_id")
  title            String
  body             String
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  creatorProfile CreatorProfile @relation(fields: [creatorProfileId], references: [id], onDelete: Cascade)
  author         User           @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([creatorProfileId, createdAt])
  @@map("community_posts")
}
```

- `CreatorProfile` 모델에 `communityPosts CommunityPost[]` 관계 필드 추가 필요.
- `User` 모델에 `communityPosts CommunityPost[]` 관계 필드 추가 필요.

> 주의: 본 SPEC은 스키마 변경을 직접 수행하지 않는다. 구현 담당자는 본 SPEC의 §3를 근거로 `CommunityPost` 생성 마이그레이션 PR을 먼저 병합해야 한다.

### 상태 전환

- 본 SPEC이 다루는 도메인 상태 머신은 없다. 접근 권한은 멤버십/참여 상태(다른 SPEC이 관리)에 파생된다.

## 4. 기능 요구사항 (EARS)

### 커뮤니티 접근 제어

- **FR-001**: THE SYSTEM SHALL `canAccessCommunity(userId, creatorProfileId)` 헬퍼를 제공하고, 다음 중 하나라도 참이면 `true`를 반환해야 한다:
  - 해당 크리에이터에 대한 활성 `Membership` 존재 (SPEC-003 `isActiveMember`)
  - 해당 크리에이터의 어떤 `Program`에 대해 `status=ACCEPTED`인 `ProgramApplication`이 있고, 연결된 `Contract.payments`에 `status IN (PAID, RELEASED)`인 레코드가 존재
  - 본인이 해당 `CreatorProfile`의 소유 크리에이터 (`user.role=CREATOR && user.creatorProfile.id === creatorProfileId`)
- **FR-002**: WHEN 비권한 사용자(비멤버, 미참여, 미결제)가 크리에이터 커뮤니티 영역에 접근하면, THE SYSTEM SHALL 커뮤니티 콘텐츠를 숨기고 "멤버십 가입 또는 프로그램 참여 시 열립니다" CTA를 표시해야 한다.

### 커뮤니티 글

- **FR-003**: WHEN 권한 사용자가 `/creators/[creatorId]`의 "커뮤니티" 탭에 접근하면, THE SYSTEM SHALL 해당 크리에이터의 `CommunityPost` 목록(최신순, `author` 이름 포함)을 표시해야 한다.
- **FR-004**: WHEN 권한 사용자가 글 작성 폼(`title`, `body`)을 제출하면, THE SYSTEM SHALL `CommunityPost`(현재 `userId`를 `authorId`로, 현재 크리에이터를 `creatorProfileId`로)를 생성해야 한다.
- **FR-005**: IF 비권한 사용자가 글 작성 액션을 호출하면, THE SYSTEM SHALL 403을 반환해야 한다.
- **FR-006**: WHEN 작성자 본인이 자신의 `CommunityPost`를 수정/삭제하면, THE SYSTEM SHALL 해당 작업을 수행해야 한다 (크리에이터는 자기 스튜디오의 모든 글을 관리할 수 있음 — 선택 정책).
- **FR-007**: IF 다른 사용자(비작성자, 비소유 크리에이터)가 타인의 글을 수정/삭제하면, THE SYSTEM SHALL 403을 반환해야 한다.

### 멤버/참여자 명단 (크리에이터)

- **FR-008**: WHEN 크리에이터가 `/dashboard/creator/members`에 접근하면, THE SYSTEM SHALL 본인 스튜디오의 활성 멤버 목록(`Membership` → `User` 이름, 가입일)을 표시해야 한다.
- **FR-009**: WHEN 크리에이터가 `/dashboard/creator/programs/[id]/participants`에 접근하면, THE SYSTEM SHALL 해당 프로그램의 `ACCEPTED` 신청자 중 결제 완료(`Payment.status IN PAID, RELEASED`)인 사용자 목록을 표시해야 한다.
- **FR-010**: IF 비소유 크리에이터 또는 팬이 멤버/참여자 명단 페이지에 접근하면, THE SYSTEM SHALL 403을 반환해야 한다.
- **FR-011**: WHEN 팬이 `/dashboard/fan/memberships`에 접근하면, THE SYSTEM SHALL 본인의 활성 `Membership` 목록(크리에이터명, 플랜명, 가입일)을 표시해야 한다.

## 5. 비기능 요구사항

- **NFR-001 (접근제어)**: 모든 커뮤니티 글 조회/작성과 명단 조회는 서버 측 권한 검증을 수행해야 한다 (클라이언트 게이트 금지).
- **NFR-002 (성능)**: 멤버 명단 쿼리는 `Membership.findMany({ where: { plan: { creatorProfileId } }, include: { user } })` 형태로 N+1을 피해야 한다.
- **NFR-003 (데모 안정성)**: 시드는 최소 2개의 `CommunityPost`(권한 사용자 관점에서 보이도록)를 포함해야 한다.
- **NFR-004 (권한 파생)**: 접근 권한은 다른 SPEC의 상태(`Membership`, `ProgramApplication`, `Payment`)에 의해 결정되며, 본 SPEC은 그 상태를 **직접 변경하지 않는다**.

## 6. API / Server Action 명세

PRD §8.3 (멤버 목록), §8.4 (커뮤니티 — 본 SPEC에서 신규 정의) 기준.

| 기능 | 식별자 | 메서드 | 경로/함수 | 권한 | 입/출력 요약 |
|---|---|---|---|---|---|
| 커뮤니티 접근 판정 | `canAccessCommunity(userId, creatorProfileId)` | — | lib (lib/community-access.ts) | 내부 | → `boolean` |
| 커뮤니티 글 목록 | — | GET | `/api/creators/:id/community-posts` 또는 서버 컴포넌트 | 권한 사용자 | → `CommunityPost[]` |
| 커뮤니티 글 작성 | `createCommunityPost` | POST | `/api/community-posts` 또는 Server Action | 권한 사용자 | `{ creatorProfileId, title, body }` → `CommunityPost` |
| 커뮤니티 글 수정/삭제 | `updateCommunityPost`, `deleteCommunityPost` | PATCH/DELETE | `/api/community-posts/:id` | 작성자 본인 또는 소유 크리에이터 | 부분 필드 / 삭제 |
| 멤버 목록 | — | GET | `/api/studio/members` 또는 서버 컴포넌트 | 크리에이터 본인 | → `Membership[]`(user 포함) |
| 참여자 목록 | — | GET | `/api/programs/:id/participants` 또는 서버 컴포넌트 | 크리에이터 본인 | → `ProgramApplication[]`(user, payment 상태 포함) |
| 내 멤버십 목록 | — | GET | `/api/me/memberships` 또는 서버 컴포넌트 | 인증됨 | → `Membership[]`(plan.creatorProfile 포함) |

## 7. UI / 페이지

PRD §13.1, §13.2 기준.

| 경로 | 사용자 | 주요 컴포넌트 |
|---|---|---|
| `/creators/[creatorId]` 커뮤니티 탭 | 권한 사용자 | `CommunityPostList`, `CommunityPostComposer`(글 작성 폼) |
| `/creators/[creatorId]` 커뮤니티 탭 (비권한) | 비멤버 | `CommunityLockedNotice`(멤버십 가입 / 프로그램 참여 CTA) |
| `/dashboard/creator/members` | 크리에이터 본인 | `MemberList`(이름, 플랜, 가입일) |
| `/dashboard/creator/programs/[id]/participants` | 크리에이터 본인 | `ParticipantList`(이름, 결제 상태 배지) |
| `/dashboard/fan/memberships` (또는 `/dashboard/fan`) | 팬 본인 | `MyMemberships` |

## 8. 인수 기준 (Acceptance Criteria)

- **AC-001**: Given 비멤버·미참여 팬, When `/creators/[id]` 커뮤니티 탭에 접근하면, Then 글 목록이 숨겨지고 "멤버십 가입 또는 프로그램 참여 시 열립니다" CTA가 표시된다.
- **AC-002**: Given 크리에이터 X의 활성 멤버 F, When F가 커뮤니티 탭에 접근하면, Then 글 목록과 작성 폼이 표시된다.
- **AC-003**: Given 결제 완료 참여자 F (`ACCEPTED` + `Payment.status=PAID`), When F가 해당 크리에이터의 커뮤니티에 접근하면, Then 활성 멤버십이 없어도 접근이 허용된다.
- **AC-004**: Given 권한 사용자 F, When F가 `title="안녕하세요"`, `body="첫 글"`로 글 작성을 제출하면, Then `CommunityPost(authorId=F, creatorProfileId=X)`가 생성되고 목록에 즉시 표시된다.
- **AC-005**: Given 비권한 사용자, When `createCommunityPost`를 호출하면, Then 403이 반환되고 글이 생성되지 않는다.
- **AC-006**: Given 크리에이터 X, When `/dashboard/creator/members`에 접근하면, Then X의 모든 활성 멤버(`Membership` → `User`) 목록이 표시된다.
- **AC-007**: Given 크리에이터 X, When `/dashboard/creator/programs/[id]/participants`에 접근하면, Then `ACCEPTED` + 결제 완료 신청자만 표시되고, 미결제 `ACCEPTED` 신청자는 "결제 대기"로 표시되거나 제외된다 (정책에 따라 표시).
- **AC-008**: Given 팬 F, When `/dashboard/fan/memberships`에 접근하면, Then 본인의 활성 멤버십 목록(크리에이터명, 플랜명)이 표시된다.
- **AC-009**: Given 크리에이터 B(비소유자) 또는 비CREATOR, When A의 멤버/참여자 명단 페이지에 접근하면, Then 접근이 차단된다. Next.js App Router의 page 컴포넌트는 HTTP 상태 코드를 직접 반환할 수 없으므로(redirect/notFound만 가능), 미인증·비CREATOR는 `/login`으로 redirect, 비소유 CREATOR는 `notFound()`(정보 노출 방지)로 처리한다.
- **AC-010**: Given 글 작성자 F, When F가 본인 글을 삭제하면, Then 글이 목록에서 제거된다. 다른 사용자 G가 F의 글 삭제를 시도하면 403이 반환된다.
- **AC-011**: `npm run lint`, `npm run typecheck`, `npm run build`가 통과된다.

## 9. 의존성 및 선행 SPEC

- **선행 SPEC**: SPEC-001, SPEC-002, SPEC-003 (`isActiveMember`), SPEC-005 (`ACCEPTED` 신청), SPEC-006 (결제 완료 상태).
- **스키마 보완 선행 (필수)**: `CommunityPost` 모델 신규 생성 + `CreatorProfile.communityPosts`, `User.communityPosts` 관계 필드 추가.
- **후행 SPEC**: SPEC-008 (완료 후 리뷰 — 본 SPEC의 참여자 명단과 연관).

## 10. 제외 사항 (Won't)

- 댓글, 대댓글, 좋아요, 스크랩 — PRD §4.1 "댓글은 선택", MVP 핵심 아님.
- 실시간 채팅 / DM — PRD §4.3 Won't.
- 멤버 활동 이력 상세 요약 — PRD §4.2 P1.
- 멤버 추방/차단/신고 — MVP 범위 밖.
- 커뮤니티 이미지/미디어 업로드 — URL 입력만 (PRD §5.1).
- 커뮤니티 글 검색/필터/태그 — P1.
- 공지사항(핀) 기능 — 별도 UX 결정 시 추가 가능하나 본 SPEC 범위 밖.

## 11. 구현 노트 (SYNC)

- **상태**: completed (Level 1 spec-first) — TDD(RED-GREEN-REFACTOR), harness: standard.
- **필드명 결정**: `CommunityPost.body` 대신 실제 스키마 기준 `content` 사용 (검증·쿼리·API·시드 전반이 일치).
- **참여자 명단 정책 (AC-007)**: `ACCEPTED` 전체 표시 + 결제상태 배지. 미결제 `ACCEPTED`는 "결제 대기"로 표시(제외 아님).
- **구현 매핑**:
  - 접근제어 — `lib/community-access.ts` (`canAccessCommunity`, 결제완료 = `ProgramApplication.ACCEPTED` + `Contract.payments.status IN (PAID, RELEASED)`).
  - 쿼리 — `lib/queries/community.ts`, `lib/queries/members.ts` (N+1 회피 `include`).
  - 검증 — `lib/validation/community-post.ts`.
  - API — `src/app/api/community-posts/route.ts` (GET/POST), `[id]/route.ts` (GET/PATCH/DELETE). 403은 서버 측(NFR-001).
  - 페이지 — `/dashboard/creator/members`, `/dashboard/creator/programs/[id]/participants`, `/dashboard/fan/memberships`.
  - 컴포넌트 — `src/components/community/*`.
- **스키마 보완**: `prisma/migrations/20260619140000_spec007_community_post` (추가형, 멱등).
- **품질**: lint(clean)·typecheck(0 err)·build(exit 0)·vitest 412/412 통과 (AC-011).
