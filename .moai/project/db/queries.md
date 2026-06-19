---
engine: postgresql
orm: prisma
status: planned
---

# Query Patterns — ArtBridge

> Prisma Client 쿼리 기준. 원본 SQL은 참조용(`product.md` §5 데모 플로우 대응).
> 성능 최적화는 `schema.md` §Indexes의 권장 인덱스가 전제됩니다.

---

## Common Queries

### 스튜디오 공개 포스트 피드 (페이지네이션)

```sql
-- Purpose: 크리에이터 스튜디오 페이지의 공개/멤버 포스트를 최신순으로
-- Parameters: $1 = creator_profile_id, $2 = limit, $3 = offset
-- Returns: 포스트 목록 (로그인한 팬의 멤버십에 따라 visibility 필터링은 앱 레이어)

SELECT id, title, visibility, created_at
FROM posts
WHERE creator_profile_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

```ts
// Prisma
const posts = await prisma.post.findMany({
  where: { creatorProfileId },
  orderBy: { createdAt: 'desc' },
  take: limit,
  skip: offset,
});
```

### 사용자의 활성 멤버십 조회

```sql
-- Purpose: 팬이 가입한 멤버십 목록 (멤버 전용 콘텐츠 접근 권한 확인)
-- Parameters: $1 = user_id

SELECT m.id, m.started_at, p.title, p.price_krw, c.studio_name
FROM memberships m
JOIN membership_plans p ON p.id = m.plan_id
JOIN creator_profiles c ON c.id = p.creator_profile_id
WHERE m.user_id = $1;
```

### 프로그램별 신청 목록 (크리에이터 관리 화면)

```sql
-- Purpose: 크리에이터가 자신의 프로그램에 접수된 신청을 상태별로 조회
-- Parameters: $1 = program_id, $2 = status (optional)

SELECT pa.id, pa.status, pa.created_at, u.email, u.name
FROM program_applications pa
JOIN users u ON u.id = pa.user_id
WHERE pa.program_id = $1
  AND ($2::text IS NULL OR pa.status = $2)
ORDER BY pa.created_at DESC;
```

### 읽지 않은 알림 카운트

```sql
-- Purpose: 헤더 배지에 표시할 읽지 않은 알림 수
-- Parameters: $1 = user_id

SELECT COUNT(*) AS unread_count
FROM notifications
WHERE user_id = $1 AND read_at IS NULL;
```

---

## Aggregations

### 크리에이터별 정산 대기 금액

```sql
-- Purpose: 크리에이터가 정산받을 대기 중 금액 합산 (수수료 10% 차감 후)
-- Frequency: 크리에이터 대시보드 진입 시
-- Performance note: payments(status, created_at) 인덱스 권장

SELECT
  cp.user_id AS creator_user_id,
  SUM(s.payout) AS pending_payout
FROM settlements s
JOIN payments pay ON pay.id = s.payment_id
JOIN contracts con ON con.id = pay.contract_id
JOIN program_applications pa ON pa.id = con.application_id
JOIN programs prog ON prog.id = pa.program_id
JOIN creator_profiles cp ON cp.id = prog.creator_profile_id
WHERE s.status = 'PENDING'
GROUP BY cp.user_id;
```

### 멤버십 플랜별 활성 가입자 수

```sql
-- Purpose: 크리에이터가 플랜별 구독자 현황 파악
-- Frequency: 크리에이터 대시보드

SELECT
  p.id AS plan_id,
  p.title,
  COUNT(m.id) AS active_members
FROM membership_plans p
LEFT JOIN memberships m ON m.plan_id = p.id
GROUP BY p.id, p.title
ORDER BY active_members DESC;
```

---

## Reports

### 크리에이터 월별 정산 리포트

```sql
-- Purpose: 크리에이터의 월별 매출/정산 요약
-- Used by: 크리에이터 정산 리포트 화면
-- Estimated runtime: < 1s (잘 인덱싱된 경우)

SELECT
  DATE_TRUNC('month', pay.created_at) AS month,
  COUNT(*) AS payment_count,
  SUM(pay.amount) AS gross,
  SUM(s.payout) AS net_payout
FROM payments pay
JOIN settlements s ON s.payment_id = pay.id
JOIN contracts con ON con.id = pay.contract_id
JOIN program_applications pa ON pa.id = con.application_id
JOIN programs prog ON prog.id = pa.program_id
WHERE prog.creator_profile_id = $1
  AND pay.status = 'RELEASED'
GROUP BY month
ORDER BY month DESC;
```

> **Mock 결제 주의**: 실제 송금은 없고 상태머신 시뮬레이션이므로 리포트 수치는 데모용.
> `tech.md` §7 방어 의사결정 참조.

### 크리에이터 평점 집계 (SPEC-008 FR-012, AC-011, AC-012)

```sql
-- Purpose: 크리에이터의 모든 프로그램 리뷰 평균 평점 + 개수
-- Used by: CreatorRatingSummary (/creators/[creatorId] 소개 탭)
-- Estimated runtime: < 1s (program_id 인덱스 + creator_profile_id 인덱스)

SELECT
  ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
  COUNT(*) AS review_count
FROM reviews r
JOIN programs prog ON prog.id = r.program_id
WHERE prog.creator_profile_id = $1;
-- 리뷰 0건이면 avg_rating = NULL → "리뷰 없음" 표시 (AC-012).
-- 1인 1회는 @@unique(program_id, user_id)로 DB 강제 (NFR-003).
```

> 구현체는 Prisma `review.aggregate({ where: { program: { creatorProfileId } } })`
> (`lib/queries/reviews.ts::getCreatorRating`). 반올림은 JS에서 재적용.

### PAID 포스트 구매 여부 확인 (SPEC-009 FR-007/AC-003/AC-006)

```sql
-- Purpose: 팬이 특정 PAID 포스트를 구매했는지 확인 (hasPurchasedPost)
-- Parameters: $1 = post_id, $2 = fan_user_id
-- Returns: 레코드 존재 여부 (true = 열람 허용)

SELECT id
FROM payments
WHERE post_id = $1
  AND fan_user_id = $2
  AND status IN ('PAID', 'RELEASED')
LIMIT 1;
```

```ts
// Prisma (lib/post-access.ts::hasPurchasedPost)
const existing = await prisma.payment.findFirst({
  where: { postId, fanUserId: userId, status: { in: ['PAID', 'RELEASED'] } },
});
return existing !== null;
```

> `payments_post_id_fan_user_id_status_idx` 복합 인덱스가 이 쿼리를 커버한다(SPEC-009 안 A).
> `PENDING`·`FAILED` 상태는 열람 허용 안 함(FR-008/AC-006).

### PAID 포스트 단건 구매 트랜잭션 (SPEC-009 FR-003/NFR-002)

```ts
// Prisma (lib/post-purchase.ts::purchasePost)
// 중복 구매 사전 체크 후 단일 $transaction으로 원자 처리
const [payment, _settlement, _notification] = await prisma.$transaction([
  prisma.payment.create({
    data: { postId, fanUserId, amount, feeKrw: Math.round(amount * 0.1), status: 'PAID' },
  }),
  prisma.settlement.create({
    data: { paymentId: '<payment.id>', payout: amount - feeKrw, status: 'PENDING' },
  }),
  prisma.notification.create({
    data: { userId: fanUserId, type: 'PAYMENT_COMPLETED', message: '...', linkUrl: `/posts/${postId}` },
  }),
]);
```

> 트랜잭션 실패(Settlement 생성 오류 등) 시 전체 롤백 — Payment만 남는 상황 없음(NFR-002/AC-011).
