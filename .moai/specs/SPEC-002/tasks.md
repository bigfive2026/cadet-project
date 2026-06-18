## Task Decomposition
SPEC: SPEC-002
Methodology: TDD (RED-GREEN-REFACTOR), coverage target 85%

Approved decisions:
- Studio save: PATCH /api/studio route handler (AC-006 403)
- Data fetch: Server Component direct Prisma (single include, NFR-003)
- /api/creators list route: SKIPPED (no AC requires it)
- Tabs: client useState
- AppCreatorProfile: extend with 5 new nullable fields
- Edit form: /dashboard/creator/edit sub-route
- Seed: full enrichment (creator2 + 5 new fields on both creators)

| Task ID | Description | Requirement | Dependencies | Planned Files | Status |
|---------|-------------|-------------|--------------|---------------|--------|
| T-001 | AppCreatorProfile + getCurrentUser extend with 5 new fields | FR-008, FR-010 | - | src/lib/types.ts(M), src/lib/auth.ts(M), auth.test.ts | pending |
| T-002 | Studio data-access helpers (single include) | FR-001, FR-003, NFR-003 | T-001 | src/lib/queries/studio.ts, queries/studio.test.ts | pending |
| T-003 | PATCH /api/studio route + Zod validation | FR-009, FR-010, AC-005, AC-006, NFR-002 | T-001 | src/app/api/studio/route.ts, src/lib/validation/studio.ts, studio.route.test.ts | pending |
| T-004 | CreatorCard component | FR-001, FR-002, NFR-004 | - | src/components/creators/CreatorCard.tsx, CreatorCard.test.tsx | pending |
| T-005 | StudioHeader + StudioTabs + list components | FR-003~FR-007 | T-004 | src/components/studio/StudioHeader.tsx, StudioTabs.tsx, PostCardList.tsx, MembershipPlanCardList.tsx, ProgramCardList.tsx, StudioTabs.test.tsx | pending |
| T-006 | /creators list page | FR-001, AC-001 | T-002, T-004 | src/app/(app)/creators/page.tsx(M), creators.page.test.tsx | pending |
| T-007 | /creators/[creatorId] detail + 404 | FR-003, FR-011, AC-002, AC-003, AC-007 | T-002, T-005 | src/app/(app)/creators/[creatorId]/page.tsx, studio.page.test.tsx | pending |
| T-008 | /dashboard/creator summary + /edit form | FR-008, FR-010, AC-004 | T-001, T-003 | src/app/(app)/dashboard/creator/page.tsx(M), src/app/(app)/dashboard/creator/edit/page.tsx, src/components/studio/StudioEditForm.tsx, dashboard.creator.test.tsx | pending |
| T-009 | prisma/seed.ts enrichment | NFR-001, AC-001 | - | prisma/seed.ts(M) | pending |

M = modify existing file.

Parallelizable after T-001: T-002, T-003, T-004, T-009. Then T-005 → T-006 → T-007 → T-008.
