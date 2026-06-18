## Task Decomposition
SPEC: SPEC-003 (멤버십 플랜·가입 및 멤버 전용 포스트 접근 제어)
Methodology: TDD (RED-GREEN-REFACTOR) · Coverage target: 85%

| Task ID | Description | Requirement | Dependencies | Planned Files | Status |
|---------|-------------|-------------|--------------|---------------|--------|
| T-001 | isActiveMember 헬퍼 | FR-007, AC-008 | - | src/lib/membership.ts, src/lib/membership.test.ts | done |
| T-002 | canViewPost 헬퍼 | FR-008 | T-001 | src/lib/post-access.ts, src/lib/post-access.test.ts | done |
| T-003 | Zod 스키마 (plan+post, PAID→priceKrw>0) | FR-001, FR-012, FR-013, AC-007 | - | src/lib/validation/membership.ts, src/lib/validation/post.ts (+tests) | done |
| T-004 | POST /api/membership-plans | FR-001, FR-002, AC-009 | T-003 | src/app/api/membership-plans/route.ts (+test) | done |
| T-005 | POST /api/posts | FR-012, FR-013, AC-006, AC-007 | T-003 | src/app/api/posts/route.ts (+test) | done |
| T-006 | joinMembership Server Action (P2002 멱등) | FR-004, FR-005, FR-006, AC-003, NFR-003 | T-001 | src/app/(app)/creators/[creatorId]/actions.ts (+test) | done |
| T-007 | /posts/[id] 페이지 + 잠금 프리뷰 (body 미누출) | FR-008~011, AC-001/002/004/005, NFR-002 | T-002 | src/app/(app)/posts/[id]/page.tsx, src/components/posts/{PostDetail,LockedPostPreview}.tsx (+test) | done |
| T-008 | 스튜디오 페이지 접근제어 연결 | FR-003, FR-006, FR-009, AC-003, NFR-002 | T-001, T-002, T-006 | MODIFY [creatorId]/page.tsx, StudioTabs.tsx, MembershipPlanCardList.tsx; NEW MembershipPlanCardList.test.tsx | done |
| T-009 | 크리에이터 대시보드 폼 | FR-001, FR-012 | T-004, T-005 | src/app/(app)/dashboard/creator/{posts,memberships}/new/page.tsx; src/components/dashboard/{PostCreateForm,MembershipPlanForm}.tsx | done |
| T-010 | 시드 검증/보강 | NFR-001 | - | prisma/seed.ts (verify) | done (변경 없음, 기존 시드가 NFR-001 충족) |

## Acceptance Criteria → Task Mapping
- AC-001 (비멤버 MEMBER_ONLY 잠금, body 미누출) → T-002, T-007
- AC-002 (가입 후 전체 body) → T-006, T-007
- AC-003 (중복 가입 멱등 + CTA "완료") → T-006, T-008
- AC-004 (PUBLIC 미로그인 열람) → T-002, T-007
- AC-005 (크리에이터 본인 MEMBER_ONLY 열람) → T-002, T-007
- AC-006 (PAID 생성 + 잠금 UI) → T-005, T-007
- AC-007 (PAID priceKrw 검증 에러) → T-003, T-005, T-009
- AC-008 (isActiveMember true/false) → T-001
- AC-009 (비크리에이터 403) → T-004
- AC-010 (lint/typecheck/build 통과) → all
