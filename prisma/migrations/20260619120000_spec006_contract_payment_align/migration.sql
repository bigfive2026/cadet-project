-- SPEC-006: align `contracts` with schema (prior `db push` drift) and add the
-- 1-contract-1-payment guard on `payments`. Written idempotently so it is safe
-- on the already-drifted live DB and reproducible on a fresh `migrate reset`.

-- contracts: replace the legacy `agreed_at` column with the signing-tracking
-- columns the schema/runtime already rely on.
ALTER TABLE "contracts" DROP COLUMN IF EXISTS "agreed_at";
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "agreed_amount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "fan_signed_at" TIMESTAMP(3);
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "creator_signed_at" TIMESTAMP(3);

-- payments: enforce one payment per contract (SPEC-006 FR-008, AC-005).
-- contract_id is nullable; Postgres permits multiple NULLs, so membership
-- payments (contract_id IS NULL) are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS "payments_contract_id_key" ON "payments"("contract_id");
