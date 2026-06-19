-- SPEC-009 안 A: Payment에 단건 PAID 포스트 구매 슬롯(post_id) 추가.
-- membership_id/contract_id와 동일한 nullable 선택적 패턴.

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "post_id" TEXT;

-- CreateIndex
CREATE INDEX "payments_post_id_fan_user_id_status_idx" ON "payments"("post_id", "fan_user_id", "status");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
