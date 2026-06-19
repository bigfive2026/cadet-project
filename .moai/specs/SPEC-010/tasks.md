## Task Decomposition
SPEC: SPEC-010

| Task ID | Description | Requirement | Dependencies | Planned Files | Status |
|---------|-------------|-------------|--------------|---------------|--------|
| T-001 | Suggestion zod schema + types | FR-008, NFR-004 | - | src/lib/ai/suggest.ts | pending |
| T-002 | suggestMock deterministic mapping | FR-003, NFR-005, AC-003 | T-001 | src/lib/ai/suggest.ts | pending |
| T-003 | suggestWithOpenAI (fetch + 15s timeout) | FR-002, NFR-003, AC-004 | T-001 | src/lib/ai/suggest.ts | pending |
| T-004 | suggestProgram branch + fallback | FR-004, FR-008, AC-004, AC-008 | T-002, T-003 | src/lib/ai/suggest.ts | pending |
| T-005 | Unit tests (suggest.ts) | AC-003, AC-004, AC-008 | T-004 | src/lib/ai/suggest.test.ts | pending |
| T-006 | Route handler (auth 403 + validation) | FR-001, FR-006, FR-007, AC-005, AC-006 | T-004 | src/app/api/programs/ai-suggest/route.ts | pending |
| T-007 | Route handler tests | AC-001, AC-005 | T-006 | src/app/api/programs/ai-suggest/route.test.ts | pending |
| T-008 | AiSuggestPanel component | FR-001, FR-009, AC-007 | - | src/components/dashboard/AiSuggestPanel.tsx | pending |
| T-009 | AiSuggestionCard component | FR-005, AC-002 | - | src/components/dashboard/AiSuggestionCard.tsx | pending |
| T-010 | Integrate in new/page.tsx (controlled apply) | FR-005, AC-002 | T-008, T-009 | src/app/(app)/dashboard/creator/programs/new/page.tsx | pending |
| T-011 | .env.example uncomment OPENAI_API_KEY | FR-002, NFR-002 | - | .env.example | pending |
| T-012 | lint + typecheck + build pass | AC-009 | all | - | pending |
