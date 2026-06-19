## SPEC-004 Progress

- Started: 2026-06-18
- Mode: TDD (RED-GREEN-REFACTOR), sub-agent, harness=standard
- Precondition: Program 스키마/ProgramStatus enum 이미 보완 완료 확인 — 마이그레이션 불필요

### 구현 완료
- 검증: src/lib/validation/program.ts (+test)
- 상태 정책: src/lib/program-status.ts (전이 화이트리스트, effectiveStatus, 공개판정, 라벨) (+test)
- 서비스: src/lib/programs.ts (createProgram/updateProgram/deleteProgram, 소유권/전이 게이트) (+test)
- 쿼리: src/lib/queries/programs.ts (공개목록/상세/본인목록) (+test), studio.ts 공개필터(FR-012)
- API: src/app/api/programs/route.ts (GET·POST), src/app/api/programs/[id]/route.ts (GET·PATCH·DELETE) (+tests)
- 공개 UI: programs/page.tsx, programs/[id]/page.tsx, ProgramCard/ProgramDetail/ProgramStatusBadge (+tests)
- 대시보드 UI: dashboard/creator/programs(목록·삭제), /new(생성), /[id]/edit(수정), ProgramForm
- 포맷 유틸: src/lib/format.ts, src/lib/program-form.ts
- 시드: prisma/seed.ts recruitDeadline 보강 (NFR-001)

### 검증 (AC-011)
- vitest: PASS 197 / FAIL 0
- typecheck (tsc --noEmit): exit 0
- lint (next lint): exit 0
- build (next build): exit 0, /programs·/programs/[id]·/dashboard/creator/programs* 라우트 생성 확인

### MX 태그
- @MX:ANCHOR 추가: program-status(전이규칙), programs(소유권 게이트), api/programs(생성 경계)
