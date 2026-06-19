-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('DRAFT', 'RECRUITING', 'CLOSED', 'CONTRACTING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "creator_profiles" ADD COLUMN     "category" TEXT,
ADD COLUMN     "cover_image_url" TEXT,
ADD COLUMN     "instagram_url" TEXT,
ADD COLUMN     "profile_image_url" TEXT,
ADD COLUMN     "websiteUrl" TEXT;

-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "category" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "max_participants" INTEGER,
ADD COLUMN     "price_krw" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "recruit_deadline" TIMESTAMP(3),
ADD COLUMN     "start_date" TIMESTAMP(3),
ADD COLUMN     "status" "ProgramStatus" NOT NULL DEFAULT 'RECRUITING';

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL,
    "fan_id" TEXT NOT NULL,
    "creator_profile_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookmarks_fan_id_idx" ON "bookmarks"("fan_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_fan_id_creator_profile_id_key" ON "bookmarks"("fan_id", "creator_profile_id");

-- CreateIndex
CREATE INDEX "programs_status_idx" ON "programs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_program_id_user_id_key" ON "reviews"("program_id", "user_id");

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_fan_id_fkey" FOREIGN KEY ("fan_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_creator_profile_id_fkey" FOREIGN KEY ("creator_profile_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

