## SPEC-010 Progress

- Started: 2026-06-19
- Approach decisions (user-approved):
  - OpenAI call: native fetch (no new dependency; functional freeze 6/21 safe)
  - Recommend inputs: independent AiSuggestPanel (ProgramForm untouched)
  - Apply suggestion: controlled state in parent new/page.tsx (inject via defaultValue/ref)
- Development mode: TDD (RED-GREEN-REFACTOR), solo, standard harness
- Phase 2 (TDD) complete: all AC met
  - src/lib/ai/suggest.ts + suggest.test.ts (13 tests)
  - src/app/api/programs/ai-suggest/route.ts + route.test.ts (6 tests)
  - AiSuggestionCard (4 tests), AiSuggestPanel (3 tests), NewProgramClient (1 test)
  - new/page.tsx integrated via NewProgramClient
  - .env.example: OPENAI_API_KEY uncommented
- Verification: typecheck OK, lint OK, 501 tests pass, build OK
