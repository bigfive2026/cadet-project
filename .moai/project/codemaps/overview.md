# Codemap — ArtBridge (Overview)

> 신규 프로젝트(그린필드): 실제 소스 코드가 없으므로 아키텍처 맵은 **목표 구조**를 요약한다.
> 코드 생성 후 `/moai codemaps`를 실행하면 `modules.md`, `dependencies.md`, `entry-points.md`, `data-flow.md`가 실제 코드 기반으로 채워진다.

---

## 프로젝트 목표

ArtBridge — 신진작가(creator)와 팬(fan)을 잇는 창작자-팬 후원 커뮤니티 MVP (Steadio 벤치마크).

### 종단간 핵심 흐름
```
크리에이터 스튜디오 → 멤버십 → 유료/멤버 전용 포스트
→ 클럽/프로그램 → 팬 참여 신청 → 수락/결제 → 커뮤니티 → 리뷰
```

## 시스템 경계

- **단일 Next.js App Router 풀스택 앱** (FE + Route Handlers/Server Actions)
- **데이터**: PostgreSQL + Prisma
- **외부 연동(추상화)**:
  - Auth — Auth.js 또는 Mock (`getCurrentUser()` 추상화)
  - Payment — `PaymentProvider` 인터페이스, 기본 `MockPaymentProvider` (sandbox adapter 선택)
  - AI — OpenAI JSON schema (`/api/programs/ai-suggest`, Mock 폴백)

## 핵심 설계 패턴

1. **상태머신 중심 비즈니스 로직** — Program/Application/Payment/Contract 상태 전이가 척추. 부수효과(알림, 자동거절)는 전이 시점에 트리거, 트랜잭션 처리.
2. **역할 기반 접근 제어** — Creator/Fan. 재사용 함수(`canViewPost`, `isActiveMember`)로 접근 제어 분리.
3. **외부 의존 인터페이스화** — 데모 안정성 우선, Mock 기본 구현.
4. **스튜디오 중심 모델** — 하나의 `CreatorProfile`이 멤버십/포스트/프로그램/커뮤니티의 중심.

## 주의 제약

- 실제 결제/송금 금지 (상태머신 시뮬레이션)
- 6/21 기능 Freeze 이후 데모 안정화만
- 반복결제/채팅/쿠폰/오디오/배송지/환불 API는 Won't

---

_관련 문서: `../product.md`, `../structure.md`, `../tech.md`_
_원본 PRD: `0. 문서 목적.md`_
_생성일: 2026-06-18 · 상태: 플레이스홀더(코드 생성 후 확장)_
