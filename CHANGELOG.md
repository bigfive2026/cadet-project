# Changelog

본 프로젝트의 주요 변경사항을 기록합니다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며,
[유의적 버전](https://semver.org/lang/ko/) 0.x(개발 단계)으로 관리됩니다.

## [Unreleased]

### Added — SPEC-010: AI 가격·혜택·프로그램 구성 추천

- AI 추천 API `POST /api/programs/ai-suggest` — 크리에이터 전용(비로그인 401, FAN 403). 입력 `{ description, duration?, category?, targetAudience? }` → `{ suggestedPrice, benefits[], programStructure[{week,title,description}], reason, source }`.
- `lib/ai/suggest.ts` — `suggestionSchema`(zod) 런타임 검증, `suggestWithOpenAI`(네이티브 fetch + JSON Schema response_format + `AbortController` 15초 타임아웃), `suggestMock`(입력 정규화 해시 기반 결정론적 폴백), `suggestProgram`(키 존재/성공 분기 + 실패·스키마 위반 시 Mock 폴백).
- 보안 — `OPENAI_API_KEY` 서버 사이드 only. Authorization 헤더로만 전송, 본문/응답/에러/`NEXT_PUBLIC_*` 어디에도 키 평문 노출 금지(FR-006/AC-006).
- UI — `AiSuggestPanel`(독립 입력부 + 로딩 중 버튼 비활성화), `AiSuggestionCard`(결과 + 폴백 안내 + "추천 반영"), `NewProgramClient`(`ProgramForm` 미수정, key remount로 `priceKrw`/`description` 주입). 추천 반영은 폼 상태만 갱신(DB 미저장).
- 환경변수 — `.env.example`의 `OPENAI_API_KEY` 항목 활성화(빈 값 허용 → Mock 폴백).
- 신규 의존성 없음(네이티브 fetch 사용). 데모 환경(키 없음)에서도 200 + 결정론적 Mock 보장(NFR-001).
- 검증 — `npm run lint`/`typecheck`/`build` 통과, 501 테스트 통과(신규 27).

### Added — SPEC-009: PAID 포스트 단건 구매 (Mock 결제)

- 스키마 보완 — `Payment` 모델에 `postId String? @map("post_id")` 필드 + `post Post? @relation(... onDelete: SetNull)` 역관계 추가(안 A). `Post` 모델에 역관계 `payments Payment[]` 추가. 조회용 복합 인덱스 `@@index([postId, fanUserId, status])` 추가. `(membershipId, contractId, postId)` 중 정확히 하나만 not null인 제약은 앱 레이어 강제(FR-003).
- 마이그레이션 `20260619160000_spec009_post_purchase` — `payments` 테이블에 `post_id TEXT` 컬럼 추가 + `payments_post_id_fan_user_id_status_idx` 인덱스 생성 + `posts` 테이블 FK(`ON DELETE SET NULL`) 추가. 기존 데이터 비파괴, 추가형.
- 구매 API `POST /api/posts/:id/purchase` — 팬 로그인 필수(미로그인 401, FR-009/AC-009). `MockPaymentProvider.charge()` 호출 후 단일 `$transaction`으로 `Payment(postId, fanUserId, amount=priceKrw, feeKrw=Math.round(amount*0.1), status=PAID)` + `Settlement(payout=amount-feeKrw, status=PENDING)` + 팬에게 `PAYMENT_COMPLETED` 알림(`linkUrl=/posts/:id`) 원자 처리(FR-003/AC-002/NFR-002).
- 중복 구매 방지 — `(postId, fanUserId)` 기준 `status IN (PAID, RELEASED)` 레코드 존재 시 409 반환(FR-005/AC-004).
- 입력 검증 — `priceKrw`가 null 또는 0 이하이면 400(FR-004/AC-008). 검증 스키마: `src/lib/validation/post-purchase.ts`.
- 접근 제어 확장 — `canViewPost`의 PAID 분기 확장(`lib/post-access.ts`): 작성자 본인은 무조건 `true`(FR-002/AC-005), 그 외 `hasPurchasedPost(userId, postId)`(`status IN PAID, RELEASED` 존재 여부) 결과 반환(FR-006/FR-007/AC-003/AC-006). `PENDING`·`FAILED`는 잠금 유지(FR-008).
- 잠금 UI — 비구매자/미로그인 사용자에게 `LockedPostPreview`(가격 표시 + "구매하기" CTA) 노출, 응답에 `body` 미포함(FR-001/AC-001). 구매 버튼: `PurchaseButton` 컴포넌트(`src/components/posts/PurchaseButton.tsx`).
- 신규 파일 — `src/lib/post-purchase.ts`(`purchasePost`/`hasPurchasedPost`), `src/lib/post-purchase.test.ts`, `src/lib/validation/post-purchase.ts`, `src/app/api/posts/[id]/purchase/route.ts`(+`route.test.ts`), `src/components/posts/PurchaseButton.tsx`.
- 변경 파일 — `src/lib/post-access.ts`(PAID 분기 확장), `src/components/posts/LockedPostPreview.tsx`(구매 CTA 연결), `src/app/(app)/posts/[id]/page.tsx`(구매 상태 전달), `src/lib/notification-types.ts`(`PAYMENT_COMPLETED` postId 컨텍스트 분기), `src/lib/payment/provider.ts`(`PaymentInput.postId` 추가), `prisma/schema.prisma`, `prisma/seed.ts`.
- 시드 — `demo-post-3`(`visibility=PAID`, `priceKrw=5000`) 기존 유지. `fans[1]`이 `demo-post-3`을 `Payment(status=PAID, feeKrw=500)` + `Settlement(payout=4500, status=PENDING)`으로 구매 완료(`upsertPostPurchase`). `fans[0]`은 미구매로 잠금 화면, `fans[1]`은 열린 화면 즉시 시연(NFR-007/AC-007).

### Added — SPEC-008: 프로그램 완료 처리 및 리뷰

- 완료 승인(정산 릴리스) — 크리에이터 본인이 `IN_PROGRESS` 프로그램에서 `POST /api/programs/:id/complete` 호출 시 단일 `$transaction`으로 `Program.status=COMPLETED` + 해당 `ACCEPTED`/결제완료(`PAID`) 신청자의 `Payment.status=RELEASED` + 대응 `Settlement.status=RELEASED` 전환 + 각 팬에게 `REVIEW_REQUESTED` 알림을 원자 처리(FR-001/AC-001, NFR-001/AC-004 롤백 보장).
- 권한·상태 검증 — 비소유 크리에이터·팬 403(FR-003/AC-002), `IN_PROGRESS` 외 상태 400(FR-004/AC-003), 미존재/soft-delete 404.
- 리뷰 작성 — 권한 참여자(`ACCEPTED` + 결제완료)가 `COMPLETED` 프로그램에 대해 `POST /api/programs/:id/reviews`로 `rating`(1~5)+`comment?` 작성(FR-005/AC-005). 1인 1회는 사전 쿼리 + DB `@@unique([programId, userId])` 이중 차단으로 409 보장(FR-006/AC-006, NFR-003). rating 범위·정수 검증(400, FR-007/AC-007). `COMPLETED` 전(400, FR-008/AC-008)·미결제·비참여자(403, FR-009/AC-009) 차단. 수정·삭제 액션 미제공(FR-010/AC-013, 수정 불가).
- 리뷰·평점 표시 — `GET /api/programs/:id/reviews`(목록 + `avgRating` 산술평균 소수 1자리)와 크리에이터 집계 `getCreatorRating(creatorProfileId)`(`{avg, count}`, 리뷰 없으면 null). `/programs/[id]` 리뷰 영역(`ReviewList`/`ReviewForm`/`CompleteButton`)과 `/creators/[creatorId]` 소개 탭 평점 요약(`CreatorRatingSummary`)에 반영(FR-011/FR-012/AC-010~AC-012).
- 쿼리·검증·컴포넌트 — `lib/queries/reviews.ts`(`listProgramReviews`, `getCreatorRating`, `getReviewEligibility`), `lib/validation/review.ts`(`reviewSchema`), `lib/reviews.ts`(`completeProgram`/`createReview` ServiceResult 패턴), `notification-types.ts`에 `REVIEW_REQUESTED` 추가.
- 스키마 변경 없음 — `Review`의 `@@unique([programId, userId])`는 이미 최초 `init` 마이그레이션에 존재하여 본 SPEC은 신규 마이그레이션 불필요(스키마 문서 드리프트만 수정 — `reviews` UNIQUE COMPOSITE 인덱스/제약 보강).
- 시드 데이터 — `COMPLETED` 프로그램 1개 + 리뷰 2개(rating 4,5 → 평균 4.5) 추가로 크리에이터 평점이 빈 상태로 시작하지 않도록 보장(NFR-004).

### Added — SPEC-007: 커뮤니티 및 멤버 관리

- 커뮤니티 접근 제어 — `canAccessCommunity(userId, creatorProfileId)`(`lib/community-access.ts`) 헬퍼. 다음 중 하나면 `true`: 해당 크리에이터 활성 `Membership` / 결제완료 참여자(`ProgramApplication.status=ACCEPTED` + 연결 `Contract.payments` 중 `PAID`·`RELEASED`) / 소유 크리에이터 본인(FR-001). 권한은 다른 SPEC의 상태에서 파생되며 본 SPEC은 상태를 직접 변경하지 않음(NFR-004).
- 비멤버 격벽 — 비권한 사용자에게 커뮤니티 콘텐츠 숨김 + "멤버십 가입 또는 프로그램 참여 시 열립니다" CTA(`CommunityLockedNotice`)(FR-002/AC-001).
- 커뮤니티 글 CRUD — `GET /api/community-posts?creatorId=`, `POST /api/community-posts`, `PATCH|DELETE /api/community-posts/:id`. 작성은 권한 사용자, 수정·삭제는 작성자 본인 또는 소유 크리에이터(FR-003~007/AC-004,005,010). 비권한·타인 글 조작 시 403.
- 크리에이터 명단 — `/dashboard/creator/members`(활성 `Membership` → 사용자명·플랜·가입일, N+1 회피 `include`)(FR-008/AC-006), `/dashboard/creator/programs/[id]/participants`(`ACCEPTED` 전체 + 결제상태 배지, 미결제는 "결제 대기" 표시)(FR-009/AC-007). 비소유 크리에이터·팬 접근 시 403(FR-010/AC-009).
- 팬 내 멤버십 — `/dashboard/fan/memberships`(활성 멤버십 목록, 크리에이터명·플랜명·가입일)(FR-011/AC-008).
- 컴포넌트 — `CommunityPanel`, `CommunityPostList`, `CommunityPostComposer`, `CommunityLockedNotice`, `MemberList`, `ParticipantList`, `MyMemberships`.
- 쿼리·검증 — `lib/queries/community.ts`, `lib/queries/members.ts`, `lib/validation/community-post.ts`.
- Prisma 마이그레이션 `20260619140000_spec007_community_post` — `CommunityPost` 모델 신규 생성(`content` 필드 사용, SPEC 권장 `body` 대신 실제 스키마 기준) + `(creator_profile_id, created_at)` 인덱스 + `CreatorProfile.communityPosts`·`User.communityPosts` 역관계(FK ON DELETE CASCADE). 추가형이라 기존 데이터 영향 없음.
- 시드 데이터 — 커뮤니티 글 2개(권한 사용자 관점에서 보이도록)(NFR-003).

### Added — SPEC-006: 계약(약관) 및 Mock 결제

- 계약 생성/조회 — `ACCEPTED` 신청 기반 `Contract` 지연 생성(lazy), `terms Json`에 `programTitle`·`priceKrw`·약관 스냅샷 저장, 동일 `applicationId` 재생성 방지.
- 약관 서명 — 팬 본인이 "동의합니다" 체크 후 `PATCH /api/contracts/:id/sign`으로 `fanSignedAt` 설정. 미동의 시 400.
- Mock 결제 — `PaymentProvider` 인터페이스 + `MockPaymentProvider`(`lib/payment/`, 외부 의존 없음, 항상 성공). 서명 완료 후 `POST /api/contracts/:id/payment` 호출 시 단일 `$transaction`으로 `Payment(status=PAID, feeKrw=amount*0.1)` + `Settlement(payout=amount-feeKrw, status=PENDING)` 생성 + `Program.status=IN_PROGRESS` 전환 + `PAYMENT_COMPLETED` 알림.
- 중복 결제 차단 — 동일 계약에 `PAID`/`RELEASED` 결제 존재 시 409.
- 접근 제어 — 팬 본인만 서명/결제 가능(타인 403), 크리에이터(소유자)는 읽기 전용 표시.
- 계약 생성 API — `POST/GET /api/applications/:id/contract`.
- UI — `/contracts/[id]`(약관·금액·`AgreementCheckbox`·`SignButton`·`PayButton`·`PaymentSuccessCard`), `/dashboard/fan/payments`(결제 내역).
- 원화 표시 유틸 `formatKrw` 추가.
- Prisma 마이그레이션 `20260619120000_spec006_contract_payment_align` — 레거시 `contracts.agreed_at` 제거 후 서명 추적 필드(`agreed_amount`, `fan_signed_at`, `creator_signed_at`) 추가, `payments.contract_id` 유니크 인덱스로 1계약 1결제 DB 강제(FR-008/AC-005). 이미 drift된 라이브 DB와 `migrate reset` 양쪽에 안전하도록 멱등 작성.
- 시드 데이터 — `ACCEPTED` 신청 + (선택) 결제 완료 계약을 포함해 수락→결제 흐름 시연 지원(NFR-006).

### Added — SPEC-005: 팬 참여 신청·수락/거절 및 인앱 알림

- 팬의 프로그램 참여 신청 생성 — 중복 신청 차단(409), 자기 참조 금지, 모집 상태(`RECRUITING`)·모집 기한 검증.
- 크리에이터의 신청 수락/거절 — 단일 Prisma `$transaction`으로 상태 변경 + (옵션) 다른 대기 신청 자동 거절(`AUTO_REJECTED`) + 관련 알림 생성을 원자 처리(롤백 보장).
- 인앱 알림 자동 생성 — 신청/수락/거절/자동거절/모집마감 이벤트별 `Notification` 레코드.
- 알림 UI — `/notifications` 목록(미읽음 하이라이트, 클릭 시 읽음 + 링크 이동, 전체 읽음), 헤더 미읽음 배지(`NotificationBell`).
- 크리에이터 신청 관리 페이지 — `/dashboard/creator/programs/[id]/applications`(수락/거절 + 자동 거절 토글).
- REST API — `POST/GET /api/programs/:id/applications`, `PATCH /api/applications/:id`, `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`.
- Prisma 마이그레이션 `20260618232057_add_app_status_and_notif_link` — `ProgramApplicationStatus`에 `AUTO_REJECTED`/`CANCELLED` 추가, `notifications.link_url` 컬럼 추가(init 마이그레이션 누락분 보완).

### Changed

- `Program.updateProgram` — `status`가 `CLOSED`로 전이될 때 모든 `PENDING` 신청자에게 마감 알림 발송(best-effort).
- 시드 데이터 — 미읽음 알림(데모용) 추가.

### Notes

- 타깃 DB에 신규 마이그레이션 적용 필요: `npx prisma migrate deploy`.
