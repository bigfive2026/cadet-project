# Tech — ArtBridge

> 기술 스택 및 개발 환경. 원본 근거: PRD(`0. 문서 목적.md`) §5, §17.

---

## 1. 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| Framework | **Next.js App Router + TypeScript** | FE/API를 단일 레포로 구현 |
| Styling | **Tailwind CSS** | 빠른 UI 구현 |
| UI 컴포넌트 | **shadcn/ui** (직접 구현 자제) | 시간 효율화 |
| DB | **PostgreSQL** | 배포/평가 친화적 |
| ORM | **Prisma** | 스키마 기반 구현이 AI agent에 적합 |
| Validation | **Zod ^4.4.3** | 스키마 검증 — API 라우트 입력 검증용 (SPEC-002에서 도입) |
| Auth | **Mock Auth 채택** (PRD §5.2 시간 박스; `getCurrentUser()` 추상화로 Auth.js 전환 경로 보존) | 데모 안정성 우선, 외부 의존성 제거 |
| AI | **OpenAI API** (JSON schema) | 구조화된 추천 결과 |
| Payment | **Mock provider 우선**, **PortOne/Toss sandbox** adapter 선택 | 데모 안정성 우선 |
| Deploy | **Vercel** | Next.js 배포 최적 |
| Storage | URL 입력 우선, 시간 남으면 **Cloudinary/Supabase Storage** | 이미지 업로드 리스크 감소 |

### 구현 선택 기준
- 시간이 1일 이상 남고 인증이 안정적이면 Auth.js 적용
- 시간 부족하면 `MockAuthProvider` + seed user로 역할 전환
- 결제는 `PaymentProvider` 인터페이스 먼저 생성, 기본 구현체는 `MockPaymentProvider`
- 실제 PG sandbox는 시간 남을 때만 `PortOnePaymentProvider` / `TossPaymentProvider`로 확장
- 모든 외부 키는 `.env`에 두고 `.env.example`을 반드시 생성

---

## 2. 도메인-식별자 매핑 (코드 통일)

화면 용어 → 코드 식별자: `FAN` / `CREATOR` / `CreatorProfile` / `MembershipPlan` / `Membership` / `Post` / `Program` / `ProgramApplication` / `Contract` / `Payment` / `Settlement` / `Notification` / `Review`. (상세: `product.md` §6)

---

## 3. 개발 환경 요구사항

- Node.js (Next.js App Router 호환 버전)
- PostgreSQL 인스턴스 (로컬 또는 Neon/Supabase)
- 환경변수 (`.env`, 커밋 금지):
  - `DATABASE_URL`
  - 인증 시크릿 (Auth.js 적용 시)
  - `OPENAI_API_KEY` (없으면 AI 추천 Mock 폴백)
  - PG sandbox 키 (선택, PortOne/Toss)
  - Storage 키 (선택, Cloudinary/Supabase)
- `.env.example`에 키 목록만 문서화 (값 없이)

---

## 4. 검증 명령어 체크리스트

Agent는 `package.json`을 먼저 확인하고 **실제 존재하는 명령어만** 실행한다.

```
npm install
npm run lint
npm run typecheck
npm run build
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

> 존재하지 않는 명령어는 `npm run typecheck is not defined in package.json. Skipped.` 처럼 보고. 성공하지 않았는데 성공했다고 보고하지 않는다.

---

## 5. 빌드 및 배포

- **FE/BE**: Vercel에 단일 Next.js 앱으로 배포 (Git 연동 자동 배포)
- **DB**: Neon/Supabase(PostgreSQL) serverless — 무료 티어
- **배포 체크리스트**:
  - 환경변수·시드 데이터 점검
  - 배포 URL에서 시드 데이터 기반 데모 동작
  - `.env` 미커밋 확인

---

## 6. Agent 작업 원칙 (Codex / Claude Code 공통)

### 공통 작업 순서
1. 레포 구조를 먼저 읽는다
2. `package.json`, `prisma/schema.prisma`, 라우트/컴포넌트 구조 확인
3. 코딩 전 5줄 이하 구현 계획 제안
4. 필요한 파일만 수정
5. 새 의존성 추가는 사전 확인
6. 타입/린트/빌드 실행
7. 변경 파일, 검증 결과, 남은 리스크 보고

### 금지 사항
- 전체 코드베이스 불필요 재작성
- 기존 스타일/라우팅 규칙 무시
- 스키마 변경 후 마이그레이션/시드/문서 누락
- 실제 결제 키/secret 하드코딩
- `.env` 커밋
- 범위 밖 기능 임의 구현
- 에러 조용히 무시 (원인·우회안 보고)

---

## 7. 방어할 의사결정 (발표 관점)

1. **WorkBridge를 그대로 만들지 않은 이유**: RFP 핵심은 양면형 거래 플랫폼 전체 흐름 구현. 구조 유지하되 관심 도메인(신진작가-팬)으로 전환.
2. **실제 반복 결제를 구현하지 않은 이유**: 반복 결제/실제 정산은 장애 리스크 高. 대신 Payment 모델·결제 상태·수수료·정산 상태 전환으로 흐름 검증.
3. **메시지/쿠폰/오디오/배송지 제외 이유**: 핵심 흐름은 스튜디오·멤버십·유료 포스트·프로그램·커뮤니티. 확장 기능은 로드맵으로 분리.
4. **Mock을 허용한 이유**: 목표는 상용 결제 시스템이 아니라 제한 시간 내 종단간 흐름을 배포 환경에서 안정 증명. Mock은 비즈니스 의미 보존하면서 리스크 축소.

---

## 8. 외부 연동 (Open API)

### 인증 (Auth.js 또는 Mock)
- `getCurrentUser()` 추상화로 Mock/Auth.js 전환
- Mock: 시드 유저 기반 역할 전환 (`loginAs(role)`)

### 결제 (Mock 우선, sandbox 선택)
```
결제 시작(MockPaymentProvider)
→ Payment.status = PAID (수수료 10% 차감, payout 계산)
→ 완료 승인 시 RELEASED (정산)
※ 실제 송금 없이 상태머신 시뮬레이션
```

### AI 추천 (OpenAI JSON schema)
```
프로그램 설명 입력
→ JSON 스키마 강제 (suggestedPrice, benefits[], programStructure[], reason)
→ API 키 없으면 결정론적 Mock 폴백
→ "추천 반영" 버튼으로 폼에 적용
```

---

## 9. 기능 Freeze (6/21)

6/21 이후 새 기능 추가 없이 데모 안정화만.
- **허용**: 버그/타입/빌드 수정, 링크 연결, 빈 화면 제거, 시드 보강, 데모 카피 수정, 배포 환경변수 정리, 발표용 UI polish
- **금지**: 실제 PG 신규 연동, Auth 전면 교체, DB 모델 대규모 변경, 실시간 채팅, 쿠폰/오디오/배송지 추가, 대규모 디자인 리팩터링

---

_원본 PRD: `0. 문서 목적.md` §5, §9, §16, §17, §19_
_생성일: 2026-06-18_
