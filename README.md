# ArtBridge

창작자-팬 후원 커뮤니티 MVP — 크리에이터가 작품과 멤버십을 올리고, 팬이 후원·신청·소통하는 웹 서비스.

**배포**: https://codeit-project-sand.vercel.app — `main` 브랜치에 push/merge 시 Vercel이 자동 배포합니다.

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **DB**: PostgreSQL + Prisma ORM
- **Auth**: Auth.js v5 (Credentials + Google OAuth 선택)
- **UI**: Tailwind CSS + shadcn/ui
- **Test**: Vitest(단위) + Playwright(E2E)

## 빠른 시작 (팀원)

### 1. 설치

```bash
npm install
```

> `postinstall` 이 자동으로 `prisma generate`를 실행합니다.

### 2. 환경 변수 설정

`.env.example`을 복사해 `.env`를 만들고 최소 두 값을 채웁니다.

```bash
cp .env.example .env
```

**로컬 데모에 필요한 최소값:**

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 (Supabase / Neon / 로컬) |
| `AUTH_SECRET` | `openssl rand -hex 32` 로 생성 |

> 이 두 값만 있어도 데모가 동작합니다. 결제·소셜로그인·AI는 **키가 없으면 Mock 폴백**으로 동작하므로 로컬에서는 아무것도 더 설정하지 않아도 됩니다.

### 3. DB 마이그레이션 & 시드

```bash
npm run db:migrate    # 스키마 반영
npm run db:seed       # 데모 데이터 생성
```

### 4. 실행

```bash
npm run dev
```

http://localhost:3000 으로 접속.

## 상용 기능 활성화 (선택)

결제(PG), Google 소셜 로그인, AI 추천, 이미지 업소드를 켜려면
**[docs/SETUP-SECRETS.md](docs/SETUP-SECRETS.md)** 의 발급 절차를 따라 `.env`에 값을 추가하세요.
키가 없는 항목은 자동으로 안전한 기본 동작(Mock)으로 폴백합니다.

| 기능 | 키 없을 때 | 키 있을 때 |
|------|-----------|-----------|
| 결제(PG) | Mock Provider (항상 성공) | PortOne/Toss sandbox |
| 로그인 | 이메일/비밀번호만 | + Google 소셜 |
| AI 추천 | 결정론적 Mock 추천 | OpenAI 호출 |
| 이미지 업로드 | 비활성화 | Cloudinary/Supabase Storage |

## 주요 스크립트

```bash
npm run dev            # 개발 서버
npm run build          # 프로덕션 빌드 (prisma generate 포함)
npm run lint           # ESLint
npm run typecheck      # 타입 검증
npm run test           # Vitest 단위 테스트
npm run test:e2e       # Playwright E2E
npm run db:studio      # Prisma Studio (DB GUI)
```

## 프로젝트 구조

```
src/
├── app/               # Next.js App Router 페이지·레이아웃·액션
│   ├── (app)/         # 인증 후 앱 영역 (크리에이터/팬)
│   ├── login/ signup/ # 인증 페이지
│   └── ...
├── components/         # UI 컴포넌트 (shadcn 기반)
├── lib/               # 유틸리티·쿼리·DB 클라이언트
prisma/
├── schema.prisma      # 데이터 모델
├── migrations/        # 마이그레이션 이력
└── seed.ts            # 데모 시드 데이터
```

## 데모 데이터 안내

`prisma/seed.ts` 의 연락처/비밀번호는 모두 **가짜 더미값**(`010-1234-5678` 형식)입니다.
실제 사용자 정보가 아닙니다.
