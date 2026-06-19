# SPEC-006: 계약(약관) 및 Mock 결제

## 1. 개요

- **목적**: 수락된 참여 신청에 대해 계약(약관)을 생성·서명하고, Mock 결제를 통해 `Payment` 상태를 `PAID`로 전환한 뒤, `Program`을 `IN_PROGRESS` 상태로 진입시킨다. PRD의 RFP "계약/결제/에스크로"에 대응한다.
- **배경**: PRD §3.2 최소 성공선 item 8 ("결제 Mock 또는 sandbox 상태 전환 후 리뷰 작성"); §4.1 P0 "계약/약관", "결제"; §5.2 "PaymentProvider 인터페이스 + MockPaymentProvider", "실제 결제 금지"; §7 Contract/Payment 모델(초안); §8.8 Contract/Payment API; §14.3 Payment 상태; Task 08; §15.1 "계약/약관 동의와 Mock 결제 흐름이 동작".
- **범위**:
  - **포함**: `Contract` 생성(수락 신청 기반), 약관 표시, 체크박스 서명(동의), `MockPaymentProvider` 인터페이스 구현, `Payment` 생성(`PAID`), 수수료 계산(10%), `Program` 상태 `IN_PROGRESS` 전환, 결제 완료 확인 페이지/알림, 정산(`Settlement`) 레코드 생성.
  - **제외**: 실제 PG 연동(PortOne/Toss sandbox — PRD §5.2 "시간이 남을 때만"), 환불 API(PR §4.3), 반복 결제(Won't), 외부 webhook 콜백 처리(실제 PG 전용).

## 2. 사용자 스토리

- As a **팬**, I want **수락된 신청에 대해 계약 페이지에서 약관을 보고 체크박스로 서명**할 수 있고, so that **참여 의사를 공식화할 수 있다**.
- As a **팬**, I want **서명 후 Mock 결제 버튼을 클릭**해 즉시 결제 완료 상태가 되고, so that **데모에서 결제 흐름이 끊기지 않는다**.
- As a **크리에이터**, I want **결제 완료 후 프로그램이 진행 중 상태**로 전환되고, so that **참여자가 커뮤니티/콘텐츠에 접근할 수 있다**.
- As a **발표자**, I want **결제 수수료(10%)와 정산 금액이 DB에 기록**되는 것을 보고, so that **비즈니스 로직(에스크로/정산)을 증명할 수 있다**.

## 3. 관련 모델 및 상태

### 관련 Prisma 모델 (실제 `prisma/schema.prisma` 기준)

- **`ProgramApplication`**: `Contract`와 1:1. `status=ACCEPTED`인 신청만 계약 생성 대상.
- **`Contract`** (`contracts`):
  - 실제 스키마: `id`, `applicationId @unique`, `terms Json`, `agreedAt @default(now())`, `createdAt`. 관계: `application ProgramApplication`, `payments Payment[]`.
  - **스키마 갭 (완화됨)**: PRD §7은 `programId`, `agreedAmount Int`, `terms String`, `fanSignedAt`, `creatorSignedAt`, `status ContractStatus`를 정의. 실제는 `applicationId`, `terms Json`, `agreedAt`만 있다. 본 SPEC은 실제 스키마를 따른다:
    - 계약 금액: `Program.priceKrw`에서 조회 (Contract에 복사 불필요, 단 `terms Json`에 스냅샷 저장 권장).
    - 서명 여부: `agreedAt` 존재 여부로 판정 (초기 생성 시 `agreedAt`을 null로 설정할 수 없다면 — **스키마 보완 필요**).
    - 양측 서명/상태: 실제 스키마에 없음 → **스키마 보완 필요(선택)** 또는 `terms Json`에 `fanSignedAt`, `creatorSignedAt`, `status`를 임베드.
- **`Payment`** (`payments`):
  - 실제 스키마: `id`, `membershipId String?`, `contractId String?`, `fanUserId`, `amount Int`, `feeKrw Int @default(0)`, `status PaymentStatus @default(PENDING)`, `createdAt`, `updatedAt`. 관계: `membership Membership?`, `contract Contract?`, `fan User`, `settlement Settlement?`.
  - **주의**: `contractId`가 `@unique`가 아니다 (PRD 초안은 unique). 본 SPEC은 한 계약당 결제 1회를 **애플리케이션 로직으로 강제**한다 (중복 결제 방지).
- **`PaymentStatus`** enum: `PENDING`, `PAID`, `RELEASED`, `REFUNDED`, `FAILED` ✓ (PRD 일치).
- **`Settlement`** (`settlements`): `id`, `paymentId @unique`, `payout Int`, `status SettlementStatus @default(PENDING)`, timestamps. 관계: `payment Payment`.
- **`SettlementStatus`** enum: `PENDING`, `RELEASED`.
- **`Program`**: `status` 보완 전제 (SPEC-004). `priceKrw`에서 계약 금액 조회.

### 스키마 보완 필요 (필수)

1. **`Contract` 모델 보완** — 서명/계약 금액 추적:
   - `Contract.agreedAmount Int @map("agreed_amount")` (또는 `terms Json`에 스냅샷)
   - `Contract.fanSignedAt DateTime? @map("fan_signed_at")`
   - `Contract.creatorSignedAt DateTime? @map("creator_signed_at")`
   - (대안) 실제 `agreedAt @default(now())`를 그대로 두고, **계약 생성 시점이 곧 팬 서명 시점**으로 간주. 단, 이 경우 "서명 전 계약" 상태를 표현할 수 없다.

   권장: `fanSignedAt DateTime?`와 `creatorSignedAt DateTime?`를 추가하고, 생성 시 둘 다 null, 팬 체크박스 시 `fanSignedAt`, 크리에이터 자동 서명(또는 별도 액션) 시 `creatorSignedAt` 설정. 양쪽 설정 시 "서명 완료"로 판정. 기존 `agreedAt @default(now())`는 생성 시각으로 유지하거나 제거.

2. **`Payment.provider` / `providerTxId` (선택)**: PRD §7에 있으나 실제 스키마 누락. Mock 데모에서는 불필요(강제 아님), 추후 sandbox 확장 시 추가 권장.

3. **`Payment.contractId @unique` (선택 강화)**: 1계약 1결제를 DB에서 강제하려면 unique 제약 추가. 애플리케이션 로직으로도 충분하므로 필수는 아님.

### 상태 전환 (PRD §14.3 Payment)

| 상태 | 의미 | 전환 트리거 |
|---|---|---|
| PENDING | 결제 전 | Payment 생성 (본 SPEC에서는 즉시 PAID로 가거나 짧은 PENDING 단계 가능) |
| PAID | 결제 완료 / 플랫폼 보관 | MockPaymentProvider 성공 |
| RELEASED | 완료 승인 후 정산 처리 | SPEC-008 완료 승인 시 |
| FAILED | 결제 실패 | (Mock에서는 발생시키지 않음; 에러 시 PENDING 유지 또는 FAILED) |
| REFUNDED | 환불 | (본 MVP 제외 — Won't) |

- 본 SPEC이 다루는 전이: `PENDING → PAID`. `RELEASED` 전환은 SPEC-008에서 트리거.

## 4. 기능 요구사항 (EARS)

### 계약 생성 및 서명

- **FR-001**: WHEN `ProgramApplication.status`가 `ACCEPTED`로 전환되면 (SPEC-005), THE SYSTEM SHALL 해당 신청에 대한 `Contract` 레코드를 자동으로 생성(`applicationId`, `terms Json`에 `programTitle`, `priceKrw` 스냅샷, 약관 텍스트 포함)해야 한다. 또는 처음 계약 페이지 조회 시 지연 생성(lazy)도 허용.
- **FR-002**: IF 이미 해당 `applicationId`에 `Contract`가 존재하면, THE SYSTEM SHALL 재생성하지 않고 기존 레코드를 반환해야 한다.
- **FR-003**: WHEN 팬이 `/contracts/[id]` 페이지에서 약관을 확인하고 "동의합니다" 체크박스를 선택한 뒤 서명 액션을 호출하면, THE SYSTEM SHALL `Contract.fanSignedAt`(보완된 필드)을 현재 시각으로 설정해야 한다.
- **FR-004**: IF 체크박스가 선택되지 않은 상태에서 서명 액션이 호출되면, THE SYSTEM SHALL 400을 반환하고 서명을 거부해야 한다.
- **FR-005**: WHILE `Contract.fanSignedAt`이 null이면, THE SYSTEM SHALL 결제 버튼을 비활성화해야 한다 (서명 선행).

### Mock 결제

- **FR-006**: THE SYSTEM SHALL `PaymentProvider` 인터페이스와 `MockPaymentProvider` 구현체를 `lib/payment/`에 제공해야 한다. 인터페이스는 `charge({ contractId, amount }): Promise<PaymentResult>` 형태여야 한다.
- **FR-007**: WHEN 팬이 서명 완료 후 "결제하기" 액션을 호출하면, THE SYSTEM SHALL `MockPaymentProvider.charge()`를 호출하고, 다음을 단일 트랜잭션으로 수행해야 한다:
  - `Payment` 생성(`contractId`, `fanUserId`, `amount=Contract.agreedAmount 또는 Program.priceKrw`, `feeKrw=amount*0.1`, `status=PAID`)
  - `Settlement` 생성(`paymentId`, `payout=amount-feeKrw`, `status=PENDING`)
  - `Program.status`를 `IN_PROGRESS`로 전환 (SPEC-004 보완 전제)
- **FR-008**: IF 동일 `contractId`에 대해 이미 `status=PAID`(또는 `RELEASED`)인 `Payment`가 존재하면, THE SYSTEM SHALL 중복 결제를 차단하고 409를 반환해야 한다.
- **FR-009**: THE SYSTEM SHALL 실제 외부 PG 호출, 실제 카드 결제, 환불 API 호출을 수행하지 않아야 한다 (PRD §5.2 "실제 결제 금지").
- **FR-010**: WHEN 결제가 완료되면, THE SYSTEM SHALL 팬에게 `type="PAYMENT_COMPLETED"` `Notification`을 생성하고 `/contracts/[id]` 확인 페이지(또는 `/dashboard/fan/payments`)에 성공 메시지를 표시해야 한다.

### 접근 제어

- **FR-011**: IF `Contract`의 `application.userId !== currentUser.id`(팬 본인 아님)이면, THE SYSTEM SHALL 계약 조회/서명/결제를 거부(403)해야 한다.
- **FR-012**: WHEN 크리에이터(해당 프로그램 소유자)가 `/contracts/[id]`에 접근하면, THE SYSTEM SHALL 읽기 전용(서명/결제 비활성)으로 표시해야 한다.

## 5. 비기능 요구사항

- **NFR-001 (트랜잭션)**: FR-007의 결제 트랜잭션은 원자적이어야 하며, 어느 한 단계 실패 시 전체 롤백된다.
- **NFR-002 (Mock 안정성)**: `MockPaymentProvider`는 외부 네트워크/파일 IO에 의존하지 않고 항상 성공을 반환해야 한다 (데모 안정성 — PRD §5.2).
- **NFR-003 (수수료 계산)**: `feeKrw = Math.round(amount * 0.1)`, `payout = amount - feeKrw`. 소수점 반올림은 일관되게 적용 (PRD Task 08 기준).
- **NFR-004 (보안)**: `.env`에 실제 PG 키를 두지 않는다. `MockPaymentProvider`는 환경 변수 없이 동작한다.
- **NFR-005 (확장성)**: `PaymentProvider` 인터페이스는 `MockPaymentProvider` 외에 향후 `PortOnePaymentProvider`/`TossPaymentProvider` 구현을 허용하는 형태여야 한다 (본 SPEC에서는 Mock만 구현).
- **NFR-006 (데모 안정성)**: 시드는 1개의 `ACCEPTED` 신청 + (선택) 1개의 이미 결제된 계약을 포함해, 발표 중 수락→결제 흐름을 바로 시연할 수 있도록 한다.

## 6. API / Server Action 명세

PRD §8.8 기준.

| 기능 | 식별자 | 메서드 | 경로/함수 | 권한 | 입/출력 요약 |
|---|---|---|---|---|---|
| 계약 생성/조회 | `getOrCreateContract` | POST/GET | `/api/programs/:id/contract` 또는 `/api/applications/:id/contract` 또는 Server Action | 팬(본인) 또는 크리에이터(소유자) | `{ applicationId }` → `Contract & { application, program }` |
| 계약 페이지 | — | GET | `/contracts/[id]` 서버 컴포넌트 | 팬 본인 / 크리에이터 소유자 | → 계약 데이터 + `Program` 요약 |
| 서명 | `signContract` | PATCH | `/api/contracts/:id/sign` 또는 Server Action | 팬 본인 | `{ agreed: true }` → `{ fanSignedAt }` |
| 결제 시작 | `startPayment` | POST | `/api/contracts/:id/payment` 또는 Server Action | 팬 본인(서명 완료) | `{ provider: "mock" }` → `{ payment, settlement, programStatus }` |
| 결제 완료 콜백(실제 PG) | — | POST | `/api/payments/callback` | 공개(서명 검증) | 본 MVP에서는 미구현 또는 no-op. 향후 sandbox용 |
| 완료 승인(정산 릴리스) | `approveCompletion` | POST | `/api/contracts/:id/approve` | 크리에이터 또는 팬 | → `Payment.status=RELEASED`, `Settlement.status=RELEASED` (본 SPEC에서는 정의만, 실제 트리거는 SPEC-008) |

## 7. UI / 페이지

PRD §13.1 기준.

| 경로 | 사용자 | 주요 컴포넌트 |
|---|---|---|
| `/contracts/[id]` | 팬 본인 / 크리에이터 소유자 | `ContractDetail`(프로그램명, 금액, 기간, 팬/크리에이터 정보, 약관 텍스트), `AgreementCheckbox`, `SignButton`, `PayButton`(서명 후 활성), 결제 완료 시 `PaymentSuccessCard`(금액, 수수료, 정산 예정액) |
| `/dashboard/fan/payments` (또는 `/dashboard/fan`) | 팬 본인 | `PaymentHistory`(결제 목록, 상태 배지) |
| `/dashboard/creator/programs/[id]/participants` | 크리에이터 소유자 | 결제 완료 여부 배지가 포함된 참여자 목록 (SPEC-007과 연동) |

## 8. 인수 기준 (Acceptance Criteria)

- **AC-001**: Given `ACCEPTED` 신청, When 팬이 `/contracts/[id]`에 처음 접근하면, Then `Contract` 레코드가 생성(`terms Json`에 `programTitle`, `priceKrw`, 약관 포함)되고 약관이 표시된다.
- **AC-002**: Given 체크박스 미선택 상태, When 팬이 서명 액션을 호출하면, Then 400이 반환되고 `fanSignedAt`은 null로 유지된다.
- **AC-003**: Given 체크박스 선택 후 서명, When 처리 완료되면, Then `fanSignedAt`이 설정되고 결제 버튼이 활성화된다.
- **AC-004**: Given 서명 완료 상태, When 팬이 "결제하기"를 클릭하면, Then 단일 트랜잭션에서 `Payment(status=PAID, feeKrw=amount*0.1)`, `Settlement(payout=amount-feeKrw, status=PENDING)`이 생성되고 `Program.status=IN_PROGRESS`로 전환되며 팬에게 `"PAYMENT_COMPLETED"` 알림이 생성된다.
- **AC-005**: Given 이미 `PAID` 결제가 있는 계약, When 다시 결제 액션을 호출하면, Then 409가 반환되고 새 `Payment`가 생성되지 않는다.
- **AC-006**: Given 팬 F가 아닌 사용자(크리에이터 A 또는 다른 팬), When F의 계약 서명 액션을 호출하면, Then 403이 반환된다.
- **AC-007**: Given 크리에이터 A가 자기 프로그램의 계약 페이지에 접근하면, When 페이지가 로드되면, Then 읽기 전용으로 표시되고 서명/결제 버튼이 비활성이다.
- **AC-008**: Given `MockPaymentProvider` 활성, When 외부 PG 서비스가 다운되어도, Then 결제는 정상 완료된다 (외부 의존성 없음).
- **AC-009**: Given 결제 트랜잭션 도중 `Settlement` 생성 실패, When 트랜잭션이 종료되면, Then `Payment`, `Program.status` 갱신이 모두 롤백된다 (DB에 PAID 레코드가 남지 않음).
- **AC-010**: Given 수수료 10% 정책, When 금액 35,000원 결제 시, Then `feeKrw=3500`, `payout=31500`이 저장된다.
- **AC-011**: `npm run lint`, `npm run typecheck`, `npm run build`가 통과된다.

## 9. 의존성 및 선행 SPEC

- **선행 SPEC**: SPEC-001, SPEC-004 (`Program.priceKrw`, `status` 보완 전제), SPEC-005 (`ACCEPTED` 신청 생성 전제).
- **스키마 보완 선행 (필수)**: `Contract` 모델에 `agreedAmount Int`, `fanSignedAt DateTime?`, `creatorSignedAt DateTime?` 추가 (또는 `terms Json`에 임베드하는 대안 채택 시 명시). `Program` 보완(SPEC-004)도 선행.
- **후행 SPEC**: SPEC-007 (참여자 커뮤니티 접근은 결제 완료 상태 기반), SPEC-008 (완료 승인 → `Payment.RELEASED` + `Settlement.RELEASED` 전환).

## 10. 제외 사항 (Won't)

- 실제 PG / sandbox 연동 (PortOne, Toss) — PRD §5.2 "시간이 남을 때만". 별도 SPEC 필요.
- 환불 API / `Payment.status=REFUNDED` 전환 흐름 — PRD §4.3 Won't.
- 반복 정기 결제 — Won't.
- 외부 PG webhook 서명 검증 — 실제 PG 전용. 본 SPEC에서는 `/api/payments/callback`을 no-op 또는 미구현.
- 에스크로 실제 은행 이체 — Mock 상태 전환으로 대체 (PRD §4.3 "관리자 정산 페이지: DB 상태 전환으로 대체").
- 다회차 가격 협상 — PRD §4.3 Won't.
- 세금 계산서/현금영수증 — MVP 범위 밖.

## 11. 구현 노트 (Sync 시점 기록)

- **상태**: completed (Level 1 spec-first).
- **품질 게이트**: `npm run lint`(eslint .) · `npm run typecheck`(tsc --noEmit) · `npm run build`(next build) 통과, `vitest run` 367/367 통과. AC-011 충족.
- **스키마 결정**: §3 "스키마 보완 필요"의 권장안을 채택. 마이그레이션 `20260619120000_spec006_contract_payment_align`에서 레거시 `contracts.agreed_at`을 제거하고 `agreed_amount`, `fan_signed_at`, `creator_signed_at`을 추가. 멱등 SQL로 작성해 기존 `db push` drift된 라이브 DB와 fresh `migrate reset` 양쪽에 안전.
- **1계약 1결제 강제**: 애플리케이션 로직(409)뿐 아니라 `payments.contract_id` 유니크 인덱스로 DB 레벨에서도 강제(FR-008/AC-005). `contract_id`는 nullable이라 멤버십 결제(`contract_id IS NULL`)는 영향 없음.
- **결제 트랜잭션**: FR-007의 Payment·Settlement 생성 + Program 상태 전환 + 알림을 단일 Prisma `$transaction`으로 원자 처리(NFR-001, AC-009).
- **PaymentProvider**: `lib/payment/`에 인터페이스 + `MockPaymentProvider`(외부 의존 없음, 항상 성공 — NFR-002/NFR-005, AC-008) 구현. 실제 PG/콜백은 범위 밖(no-op).
- **신규 디렉터리**: `src/app/(app)/contracts/`, `src/app/(app)/dashboard/fan/`, `src/app/api/contracts/`, `src/app/api/applications/[id]/contract/`, `src/components/contracts/`, `src/lib/payment/`, `src/lib/queries/contracts.ts`, `src/lib/validation/contract.ts`.
- **부수 변경**: lint 인프라 `eslint.config.mjs` 신규 추가(프로젝트 유일 lint 설정), `formatKrw` 원화 표시 유틸, `PAYMENT_COMPLETED` 알림 타입, vitest 커버리지 include 범위 확장.
