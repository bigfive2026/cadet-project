---
engine: postgresql
migration_tool: prisma-migrate
migrations_dir: prisma/migrations/
schema_source: prisma/schema.prisma
schema_hash: f8c55180566830c781e16f9d2b8214644071b29a2bc8975c9aa0e10c1ae42799
status: migrated
last_synced_at: 2026-06-18T09:02:06Z
---

# Migrations — ArtBridge

> Prisma Migrate 기반. `prisma/schema.prisma`가 소스 오브 트루스이며,
> `npx prisma migrate dev --name <name>`으로 마이그레이션을 생성합니다.
>
> **현재 상태**: `prisma/schema.prisma`의 12개 모델이 최초 마이그레이션 `init`으로
> 생성되어 Supabase(ap-south-1) DB에 적용 완료되었습니다. 시드 데이터(`prisma/seed.ts`)도
> 반영되었습니다.
> `moai-domain-db-docs` 훅이 `prisma/migrations/*/migration.sql` 변경을 감지하면
> 아래 Applied Migrations 표를 자동으로 갱신합니다.

---

## Applied Migrations

| Filename | Applied At | Checksum | Summary |
|----------|-----------|----------|---------|
| `20260618090206_init/migration.sql` | 2026-06-18T09:02:06Z | `7bab355e…2fc13b30` | 12개 테이블 + 5개 enum(Role, PostVisibility, ProgramApplicationStatus, PaymentStatus, SettlementStatus) + 인덱스 + UNIQUE 제약 일괄 생성 |

### 예정된 최초 마이그레이션 시퀀스

| Order | Name (suggested) | Summary |
|-------|------------------|---------|
| 1 | `init` | 핵심 테이블 일괄 생성 (users, creator_profiles, membership_plans, memberships, posts, programs, program_applications, contracts, payments, settlements, notifications, reviews) + 5개 enum + 인덱스 + UNIQUE 제약 |
| 2 | `_seed_ref` (선택) | 시드 데이터(`prisma/seed.ts` 참조). enum 값은 Prisma enum이므로 별도 마이그레이션 불필요 |

---

## Pending Migrations

| Filename | Created At | Description | Blocking? |
|----------|-----------|-------------|-----------|
| _(none)_ | | | |

---

## Migration Workflow (Prisma Migrate)

```bash
# 1. 스키마 변경 후 개발 환경에 마이그레이션 생성 + 적용
npx prisma migrate dev --name <descriptive_name>

# 2. 프로덕션/스테이징에 적용 (이미 생성된 마이그레이션만)
npx prisma migrate deploy

# 3. Prisma Client 재생성
npx prisma generate

# 4. 상태 확인
npx prisma migrate status
```

> **주의**: `prisma migrate dev`는 개발용만. 프로덕션에서는 반드시 `migrate deploy` 사용.
> 스키마 변경 후 시드/문서 누락 금지(`tech.md` §6 금지사항).

---

## Rollback Notes

Prisma Migrate는 자동 롤백을 기본 지원하지 않습니다. 파괴적 변경은 복구용
마이그레이션을 별도로 작성해야 합니다.

| Migration | Risk Level | Rollback Steps | Data Loss? |
|-----------|-----------|----------------|------------|
| `init` | Low | DB 초기화 후 재적용 (`prisma migrate reset`) | YES — 전체 데이터 삭제, 개발 환경만 |
| _(컬럼 추가)_ | Low | 역방향 마이그레이션으로 `DROP COLUMN` | 추가된 컬럼 데이터만 |
| _(컬럼/테이블 삭제)_ | Critical | 백업 복원 불가시 복구 불가 | YES — 사전 백업 필수 |

> 롤백 필요시: `npx prisma migrate reset`(개발 전용, 모든 데이터 소실).
> 프로덕션에서는 변경 전 `pg_dump` 백업 권장.
