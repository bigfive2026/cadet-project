# SPEC-009: PAID 포스트 단건 구매 (Mock 결제)

## 1. 개요

- **목적**: 팬이 `visibility=PAID` 포스트를 단건 구매(Mock 결제)하고, 구매 완료 후 전체 본문을 열람할 수 있도록 한다. 비구매자와 미로그인 사용자에게는 잠금 프리뷰와 구매 CTA만 노출한다.
- **배경**: PRD §4.2 P1 "단건 유료 포스트 구매 Mock — PAID 포스트 구매 상태 저장"; §4.1 P0 "포스트 — PAID는 Mock 구매 또는 잠금 UI"; §8.4 Post API; §8.8 Payment (`POST /api/contracts/:id/payment`와 병행되는 단건 결제 흐름); §14.3 Payment 상태 (`PAID` / `RELEASED`). SPEC-003은 PAID를 "잠금 UI + 안내"로만 다루었고, 본 SPEC이 구매 상태 저장을 채운다.
- **범위**:
  - **포함**: PAID 포스트 단건 구매 액션, `MockPaymentProvider` 재사용, `Payment(status=PAID)` 생성 (수수료 10% + `Settlement`), 중복 구매 방지, 구매 후 본문 노출, `canViewPost()` PAID 분기 확장, 크리에이터 본인 무제한 열람.
  - **제외**: 실제 PG 연동 (PortOne/Toss sandbox), 반복/정기 결제 (PRD §4.3 Won't), 환불 API (`Payment.status=REFUNDED`), 외부 webhook 검증, 구매 이력 페이지 상세 UI (별도 SPEC 가능), 멤버십/프로그램 결제 흐름 (SPEC-003/006).

## 2. 사용자 스토리

- As a **팬**, I want **PAID 포스트의 잠금 프리뷰에서 가격과 구매 CTA를 보고**, so that **구매 결정을 할 수 있다**.
- As a **팬**, I want **"구매하기" 클릭 한 번으로 Mock 결제가 완료되고 본문이 열리는 것**을 보고, so that **데모에서 결제-열람 흐름이 끊기지 않는다**.
- As a **이미 구매한 팬**, I want **재방문 시 추가 결제 없이 본문이 바로 열리는 것**을 보고, so that **중복 결제로 인한 불만이 없다**.
- As a **크리에이터**, I want **내가 작성한 PAID 포스트를 결제 없이 열람**할 수 있고, so that **작성자가 잠금에 걸리지 않는다**.

## 3. 관련 모델 및 상태

### 관련 Prisma 모델 (실제 `prisma/schema.prisma` 기준)

- **`Post`** (`posts`):
  - `id`, `creatorProfileId`, `title`, `body`, `visibility PostVisibility @default(PUBLIC)`, `priceKrw Int?`, timestamps
  - 관계: `creatorProfile CreatorProfile`
- **`PostVisibility`** enum: `PUBLIC`, `MEMBER_ONLY`, `PAID`
- **`Payment`** (`payments`):
  - 실제 필드: `id`, `membershipId String?`, `contractId String?`, `fanUserId`, `amount Int`, `feeKrw Int @default(0)`, `status PaymentStatus @default(PENDING)`, timestamps
  - 관계: `membership Membership?`, `contract Contract?`, `fan User`, `settlement Settlement?`
  - **CRITICAL 갭**: `Payment`에는 `Post`로의 직접 관계가 없다. 단건 포스트 구매를 저장할 슬롯이 부재.
- **`PaymentStatus`** enum: `PENDING`, `PAID`, `RELEASED`, `REFUNDED`, `FAILED`
- **`Settlement`** (`settlements`): `paymentId @unique`, `payout Int`, `status SettlementStatus @default(PENDING)`
- **`User`**: `role`, `creatorProfile CreatorProfile?`, `paymentsAsFan Payment[]`

### 스키마 보완 필요 (필수 — 둘 중 하나 권장, 본 SPEC은 **안 A** 권장)

- **안 A (권장): `Payment`에 `postId` 추가 — 기존 패턴 일관성 유지**
  - 추가 필드:
    ```
    postId String? @map("post_id")
    post   Post?   @relation(fields: [postId], references: [id], onDelete: SetNull)
    ```
  - `Post` 모델에 역관계: `payments Payment[]`
  - 이유: 이미 `membershipId`/`contractId`가 nullable 선택적 슬롯으로 존재. 같은 패턴으로 `postId`를 추가하면 `Settlement`, `Notification("PAYMENT_COMPLETED")`, 수수료 계산 로직(SPEC-006)을 그대로 재사용. PRD §7의 단일 `Payment` 엔티티 의도와 일치.
  - 비즈니스 제약 (앱 레이어): `(membershipId, contractId, postId)` 중 정확히 하나만 not null. 기존 membership/contract 결제도 같은 규칙을 이미 암묵적으로 따르므로 추가 일관성 비용 없음.
  - 중복 결제 방지: `@@index([postId, fanUserId, status])` 추가 조회용 인덱스. `postId`가 null일 수 있으므로 `@@unique([postId, fanUserId])`는 전역 unique로 사용 불가 → **애플리케이션 레벨에서 PAID 상태 중복 체크** (FR-005).
- **안 B (대안): `PostPurchase` 신규 모델** — `id`, `postId`, `userId`, `paymentId @unique`, timestamps. 의미 분리는 명확하나 Settlement/Notification/수수료 로직 복제 비용이 크고 SPEC-006 패턴과 불일치. **비권장**.

### 상태 전환 (PRD §14.3 Payment)

| 상태 | 의미 | 전환 트리거 |
|---|---|---|
| PENDING | 결제 생성 직후 (선택적 단계) | `createPurchasePayment()` 호출 |
| PAID | Mock 결제 완료 — 본문 열람 허용 | `MockPaymentProvider.charge()` 성공 |
| RELEASED | 크리에이터 정산 완료 | (본 SPEC 범위 밖; 향후 정산 SPEC에서 트리거) |
| FAILED | 결제 실패 | Mock에서는 발생시키지 않음 |
| REFUNDED | 환불 | Won't |

- 본 SPEC이 다루는 전이: 생성 → `PAID`. 본문 열람 권한은 `PAID` (또는 `RELEASED`)에서 허용.

## 4. 기능 요구사항 (EARS)

### 잠금 UI

- **FR-001**: WHEN 미로그인 사용자 또는 구매 이력이 없는 사용자가 `visibility=PAID` 포스트 `/posts/[id]`에 접근하면, THE SYSTEM SHALL 잠금 프리뷰(제목 + `priceKrw` 표시 + "유료 콘텐츠" 라벨 + "구매하기" CTA)를 표시하고, 응답 페이로드에 `body`를 포함하지 않아야 한다.
- **FR-002**: IF 접근자가 해당 포스트의 작성자(`post.creatorProfile.userId === currentUser.id`)이면, THE SYSTEM SHALL 결제 여부와 무관하게 전체 `body`를 반환해야 한다.

### 구매 요청

- **FR-003**: WHEN 팬이 PAID 포스트의 "구매하기" 액션을 호출하면, THE SYSTEM SHALL `MockPaymentProvider.charge()`를 호출하고 단일 트랜잭션으로 다음을 수행해야 한다:
  - `Payment` 생성 (`postId`, `fanUserId=currentUser.id`, `amount=post.priceKrw`, `feeKrw=Math.round(amount*0.1)`, `status=PAID`)
  - `Settlement` 생성 (`paymentId`, `payout=amount-feeKrw`, `status=PENDING`)
  - `type="PAYMENT_COMPLETED"` `Notification`을 팬에게 생성
- **FR-004**: IF `post.priceKrw`가 null이거나 0 이하이면, THE SYSTEM SHALL 구매 액션을 400으로 거부해야 한다 (PAID 포스트는 항상 양수 가격).
- **FR-005**: IF 동일 `(postId, fanUserId)`에 대해 `status IN (PAID, RELEASED)`인 `Payment`가 이미 존재하면, THE SYSTEM SHALL 새 결제 생성을 차단하고 409를 반환하며 기존 `Payment`를 재사용해야 한다 (중복 결제 방지).

### 접근 제어 (canViewPost 확장)

- **FR-006**: THE SYSTEM SHALL SPEC-003의 `canViewPost(user, post)` PAID 분기를 다음으로 확장해야 한다:
  - `post.creatorProfile.userId === user.id` (작성자 본인) → `true`
  - `post.visibility === PAID` → `hasPurchasedPost(user.id, post.id)`가 `true`이면 `true`, 아니면 `false`
- **FR-007**: THE SYSTEM SHALL `hasPurchasedPost(userId, postId)` 헬퍼를 제공하고, 이는 해당 `(postId, userId)`에 대해 `status IN (PAID, RELEASED)`인 `Payment` 레코드가 존재하면 `true`를 반환해야 한다.
- **FR-008**: WHILE `Payment.status`가 `PENDING` 또는 `FAILED`이면, THE SYSTEM SHALL 본문을 열람 허용하지 않아야 한다 (잠금 UI 유지).

### 권한

- **FR-009**: IF 비로그인 사용자가 구매 액션을 호출하면, THE SYSTEM SHALL 401을 반환하고 로그인으로 유도해야 한다.
- **FR-010**: THE SYSTEM SHALL 실제 외부 PG 호출, 카드 결제, 환불 API 호출을 수행하지 않아야 한다 (PRD §5.2 "실제 결제 금지").

## 5. 비기능 요구사항

- **NFR-001 (Mock 안정성)**: `MockPaymentProvider`는 외부 네트워크/파일 IO에 의존하지 않고 항상 성공을 반환해야 한다 (PRD §5.2, SPEC-006 NFR-002 일관).
- **NFR-002 (트랜잭션)**: FR-003의 결제 트랜잭션은 원자적이어야 하며 어느 한 단계 실패 시 전체 롤백된다 (`Payment`만 남거나 `Settlement`만 남지 않음).
- **NFR-003 (수수료 계산)**: `feeKrw = Math.round(amount * 0.1)`, `payout = amount - feeKrw`. SPEC-006 정책과 동일.
- **NFR-004 (본문 노출 제어)**: `body`는 서버 측 접근 판정(`canViewPost`) 통과 시에만 클라이언트로 전송된다. 잠금 상태 응답에는 `body` 필드가 누락되거나 빈 문자열이어야 한다 (SPEC-003 NFR-002 일관).
- **NFR-005 (보안)**: `.env`에 실제 PG 키를 두지 않는다. `MockPaymentProvider`는 환경 변수 없이 동작한다.
- **NFR-006 (확장성)**: `PaymentProvider` 인터페이스(SPEC-006)를 그대로 재사용. 단건 포스트 결제는 `contractId` 대신 `postId` 컨텍스트를 받는 변형만 허용.
- **NFR-007 (데모 시드)**: 시드는 1개 PAID 포스트(`priceKrw` 양수)를 포함해야 하며, 1명의 팬은 미구매 상태, (선택) 또 다른 팬은 이미 구매한 상태로 세팅해 잠금/열림 두 화면을 바로 시연할 수 있게 한다.

## 6. API / Server Action 명세

PRD §8.4, §8.8 기준.

| 기능 | 식별자 | 메서드 | 경로/함수 | 권한 | 입/출력 요약 |
|---|---|---|---|---|---|
| 포스트 상세 (PAID) | — | GET | `/api/posts/:id` 또는 `/posts/[id]` 서버 컴포넌트 | 접근제어 | 접근 허용 시 전체 `Post`(`body` 포함), 거부 시 `Post`에서 `body` 제외 + 잠금 메타 |
| 단건 구매 | `purchasePost` | POST | `/api/posts/:id/purchase` 또는 Server Action | 팬 (로그인) | `{ postId }` → `{ payment: { id, status, amount, feeKrw }, settlement: { payout } }` |
| 구매 여부 확인 | `hasPurchasedPost(userId, postId)` | — | `lib/post-access.ts` | 내부 | → `boolean` |
| 접근 판정 (확장) | `canViewPost(user, post)` | — | `lib/post-access.ts` | 내부 | PAID 분기 추가 (FR-006) |
| 결제 콜백 (sandbox) | — | POST | `/api/payments/callback` | 공개(서명 검증) | 본 MVP에서 미구현/no-op. 향후 sandbox 확장 시 사용 |

## 7. UI / 페이지

PRD §13.1 기준.

| 경로 | 사용자 | 주요 컴포넌트 |
|---|---|---|
| `/posts/[id]` (PAID, 비구매자) | 공개/로그인 | `LockedPostPreview`("유료 콘텐츠" 라벨, `priceKrw` 표시, 미리보기 발췌문, "구매하기" CTA) |
| `/posts/[id]` (PAID, 구매자/작성자) | 구매자/작성자 | `PostDetail`(전체 `body`) |
| 결제 확인 모달 | 팬 | `PurchaseConfirmModal`(포스트 제목, 금액, 수수료 안내, "결제하기" 버튼) |
| 구매 완료 토스트/메시지 | 팬 | `PaymentSuccessNotice`("결제가 완료되었습니다. 콘텐츠를 확인하세요.") |

## 8. 인수 기준 (Acceptance Criteria)

- **AC-001**: Given 미로그인 사용자가, When PAID 포스트 `/posts/[id]`에 접근하면, Then 잠금 프리뷰와 `priceKrw`가 표시되고 응답 페이로드에 `body`가 포함되지 않는다.
- **AC-002**: Given 로그인한 비구매 팬이, When "구매하기" 액션을 호출하면, Then 단일 트랜잭션으로 `Payment(status=PAID, feeKrw=amount*0.1)`, `Settlement(payout=amount-feeKrw, status=PENDING)`이 생성되고 `PAYMENT_COMPLETED` 알림이 생성된다.
- **AC-003**: Given 위 팬이 결제를 완료한 후, When 동일 포스트를 다시 조회하면, Then 전체 `body`가 표시된다.
- **AC-004**: Given 이미 `PAID` 결제가 존재하는 `(postId, fanUserId)`, When 동일 팬이 다시 구매 액션을 호출하면, Then 409가 반환되고 새 `Payment`가 생성되지 않는다.
- **AC-005**: Given 크리에이터 본인, When 자신이 작성한 PAID 포스트에 접근하면, Then 결제 없이 전체 `body`가 표시된다.
- **AC-006**: Given `Payment.status=PENDING`인 레코드가 존재하는 PAID 포스트, When 팬이 접근하면, Then 여전히 잠금 UI가 표시된다 (PENDING은 열람 허용 안 함).
- **AC-007**: Given `priceKrw=5000`인 PAID 포스트, When 구매 시, Then `feeKrw=500`, `payout=4500`으로 저장된다.
- **AC-008**: Given `priceKrw`가 null인 PAID 포스트, When 구매 액션을 호출하면, Then 400이 반환되고 `Payment`가 생성되지 않는다.
- **AC-009**: Given 미로그인 사용자, When 구매 액션을 호출하면, Then 401이 반환된다.
- **AC-010**: Given MockPaymentProvider 활성, When 외부 PG 서비스가 다운되어도, Then 결제는 정상 완료된다 (외부 의존성 없음).
- **AC-011**: Given 결제 트랜잭션 도중 `Settlement` 생성 실패, When 트랜잭션이 종료되면, Then `Payment` 생성도 롤백된다 (DB에 PAID 레코드가 남지 않음).
- **AC-012**: `npm run lint`, `npm run typecheck`, `npm run build`가 통과된다.

## 9. 의존성 및 선행 SPEC

- **선행 SPEC (필수)**: SPEC-001 (`getCurrentUser()` 세션), SPEC-003 (`canViewPost`, `Post`/`PostVisibility` 모델, 잠금 UI 베이스).
- **느슨한 의존 (패턴 재사용)**: SPEC-006 (`MockPaymentProvider`, `PaymentProvider` 인터페이스, `Payment`/`Settlement` 트랜잭션, 수수료 10% 정책).
- **스키마 보완 선행 (필수)**: `Payment` 모델에 `postId String?` + `Post` 역관계 `payments Payment[]` 추가 (안 A). 마이그레이션과 시드 갱신 포함.
- **후행 (선택)**: 크리에이터 정산 릴리스 SPEC — `Payment.status=PAID → RELEASED`, `Settlement.status=PENDING → RELEASED` 전환 (본 SPEC은 다루지 않음).

## 10. 제외 사항 (Won't)

- 실제 PG / sandbox 연동 (PortOne, Toss) — PRD §5.2. 별도 SPEC 필요.
- 환불 API / `Payment.status=REFUNDED` — PRD §4.3 Won't.
- 반복 / 정기 결제 — PRD §4.3 Won't.
- 외부 PG webhook 서명 검증 — 실제 PG 전용. `/api/payments/callback`은 no-op 또는 미구현.
- 구매 이력 페이지 상세 UI (팬 대시보드의 결제 탭 정리) — 별도 UX 결정 시 분리 가능. 본 SPEC은 `PAYMENT_COMPLETED` 알림과 즉시 본문 노출까지만 다룬다.
- 멤버십/프로그램 결제 흐름 — SPEC-003/006 범위.
- 쿠폰/할인 적용 — Steadio 확장 기능, MVP 밖.
