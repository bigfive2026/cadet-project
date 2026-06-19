## Task Decomposition
SPEC: SPEC-005

Legend: API style = REST routes (matches `programs` feature; SPEC §6 lists REST endpoints; AC map 1:1 to HTTP statuses).

| Task ID | Description | Requirement | Dependencies | Planned Files | Status |
|---------|-------------|-------------|--------------|---------------|--------|
| T-001 | Schema drift fix: new Prisma migration adding `ProgramApplicationStatus` AUTO_REJECTED/CANCELLED + `notifications.link_url` | §3, AC-003/006 | - | `prisma/migrations/<ts>_add_app_status_and_notif_link/migration.sql` | pending |
| T-002 | Notification type literals + type-based link resolver (NFR-005, FR-013) | NFR-005, FR-013 | - | `src/lib/notification-types.ts`, `.test.ts` | pending |
| T-003 | Application read queries: `listApplicationsForCreator`, `findActiveApplication` | FR (list), AC-001/002 | - | `src/lib/queries/applications.ts`, `.test.ts` | pending |
| T-004 | Notification read queries: `listNotifications`, `getUnreadNotificationCount` | FR-011/012, AC-007 | - | `src/lib/queries/notifications.ts`, `.test.ts` | pending |
| T-005 | Validation schemas: apply, process | FR-001/005 | - | `src/lib/validation/application.ts`, `.test.ts` | pending |
| T-006 | Application service (transactional): `applyToProgram`, `processApplication`, `notifyProgramClosed` | FR-001~010, NFR-001/003, AC-003/004/012 | T-002,T-005 | `src/lib/applications.ts`, `.test.ts` | pending |
| T-007 | Notification service: `markNotificationRead`, `markAllNotificationsRead` | FR-013/014, AC-008/009 | - | `src/lib/notifications.ts`, `.test.ts` | pending |
| T-008 | API: `POST/GET /api/programs/:id/applications` | FR-001~004, AC-001/002/011 | T-006 | `src/app/api/programs/[id]/applications/route.ts`, `.test.ts` | pending |
| T-009 | API: `PATCH /api/applications/:id` (accept/reject + autoRejectOthers) | FR-005~009, AC-003/004/005/010 | T-006 | `src/app/api/applications/[id]/route.ts`, `.test.ts` | pending |
| T-010 | API: notifications GET + mark-read + read-all | FR-011~014, AC-007/008/009 | T-004,T-007 | `src/app/api/notifications/route.ts`, `[id]/read/route.ts`, `read-all/route.ts` + tests | pending |
| T-011 | Wire `notifyProgramClosed` into program CLOSED transition (FR-010, AC-006) | FR-010, AC-006 | T-006 | `src/lib/programs.ts` (update), `.test.ts` | pending |
| T-012 | UI: `ApplyButton` (client) + ProgramDetail wiring (applied → disabled) | FR-001, AC-001 | T-008 | `src/components/programs/ApplyButton.tsx`, `ProgramDetail.tsx` (update), test | pending |
| T-013 | UI: creator applications mgmt page + `ApplicationList` + accept/reject + auto-reject toggle | FR-005~009, AC-003/004 | T-009 | `src/app/(app)/dashboard/creator/programs/[id]/applications/page.tsx`, `src/components/applications/*.tsx` | pending |
| T-014 | UI: `/notifications` page + `NotificationList` + read-all + click-to-read | FR-011/013/014, AC-007/008/009 | T-010 | `src/app/(app)/notifications/page.tsx`, `src/components/notification/*.tsx` | pending |
| T-015 | UI: `NotificationBell` unread badge in Header | FR-012, AC-007 | T-004 | `src/components/notification/NotificationBell.tsx`, `Header.tsx` (update) | pending |
| T-016 | Seed: add unread notifications for badge/list demo | NFR-002(demo), AC-007 | T-001 | `prisma/seed.ts` (update) | pending |
| T-017 | Coverage config: add new files to `vitest.config.ts` include | NFR(coverage) | T-002~T-015 | `vitest.config.ts` (update) | pending |
| T-018 | Quality gate: lint + typecheck + build + test + coverage≥80% | AC-013 | all | - | pending |

Delegation units:
- Unit A (Backend, TDD): T-001 → T-011 + T-016 + T-017 (sequential RED-GREEN-REFACTOR)
- Unit B (Frontend): T-012 → T-015 (depends on Unit A APIs)
- Unit C (Quality): T-018
