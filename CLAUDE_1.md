# CLAUDE.md — WorkBridge 개발 규칙

> 이 파일은 코딩 에이전트가 매 세션 읽는 **고정 규칙**이다. 상세 명세는 `PRD.md`를 단일 진실 공급원으로 따른다.

## 프로젝트 한 줄

의뢰인과 프리랜서를 잇는 외주 매칭 플랫폼 MVP. 등록 → 지원 → 계약 → **에스크로 결제** → **상호 리뷰**. 신뢰를 시스템이 보증한다.

## 확정 스택 (변경 금지 — 일정 잠식 방지)

- **Frontend:** React + Vite · React Router · TanStack Query · Zustand · Tailwind
- **Backend:** Node + Express
- **DB:** PostgreSQL + Prisma (schema-first)
- **Auth:** JWT(httpOnly 쿠키) + OAuth(Google, Kakao)
- **배포:** Vercel(FE) · Railway/Render(BE) · Neon/Supabase(DB)

## 하드 규칙

1. **스코프 가드.** 아키텍처 고도화·성능 최적화·인프라 설계에 시간 쓰지 않는다. "작지만 완전한 제품"이 1순위. 새 라이브러리·패턴 도입 전 멈추고 물어본다.
2. **우선순위 고정.** P0(MUST) → P1(SHOULD) → P2(COULD). P0이 안 끝났으면 P1을 시작하지 않는다. WON'T 목록(실시간 채팅, 분쟁중재, ML 추천, 모바일앱, 다국어, 어드민)은 건드리지 않는다.
3. **에스크로는 시뮬레이션.** 실제 자금 이동 없음. `Payment.status` 상태 전이(PENDING→ESCROWED→RELEASED/REFUNDED)만 구현. 데모 목적임을 코드/문구에 명시.
4. **AI는 공급자 교체형.** AI 단가 분석은 단일 함수 `estimateProject(description)` 뒤에 둔다. **Anthropic Messages API 계약 하나로만** 작성하고, 공급자는 env로 전환:
   - Anthropic: `AI_BASE_URL=https://api.anthropic.com`
   - z.ai(GLM): `AI_BASE_URL=https://api.z.ai/api/anthropic`
   - 출력은 **고정 JSON 스키마** 강제 + 파싱 검증 + 캐싱(AiAnalysis). primary 실패 시 secondary 폴백.
5. **상태 머신이 척추.** 부수효과(알림 생성, 자동 거절, 일괄 마감)는 상태 전이 시점에 트리거. 트랜잭션으로 묶는다.
6. **1인 git 흐름.** `main` 보호. 기능별 `feat/*` 브랜치 → PR → self-review → squash merge. 칸반·회고는 유지(협업 학습 목표).
7. **비밀값.** 키는 `.env`만. 커밋 금지. 로컬/배포 redirect URI 분리, OAuth `state` 검증.

## 폴더 구조 (제안)

```
/client            # React + Vite
  /src
    /api           # fetch 래퍼 + TanStack Query 훅
    /pages /components /stores
/server            # Express
  /src
    /routes        # auth, projects, applications, notifications, contracts, payments, reviews, ai
    /middleware    # auth(jwt), validate, error
    /services      # 비즈니스 로직 + 상태 전이 + 부수효과
    /lib           # ai(provider-swap), pg(toss), oauth
  /prisma          # schema.prisma, migrations, seed.ts
PRD.md  CLAUDE.md
```

## Definition of Done (게이트)

- **페이즈 2 게이트 (P0 완료선):** 가입 → 프로젝트 등록 → 탐색/지원 → 수락/거절 → 알림 수신까지 **로컬에서 전 플로우 동작**.
- **페이즈 4 게이트 (최종):** AI 분석 + 계약/서명 + 결제(테스트) + 에스크로 정산 + 리뷰까지 **배포 환경에서 동작**.

## 작업 순서 (참조: PRD §9)

준비(2d) → P1 인증·프로젝트(5d) → P2 탐색·지원·알림(5d, 게이트) → P3 AI·계약·결제(5d) → P4 에스크로·리뷰·배포(5d, 게이트).

각 페이즈 종료 시 페이즈 계획서·칸반·회고록 작성.
