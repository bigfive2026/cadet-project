-- Drift fix: add missing enum values + notification link column
ALTER TYPE "ProgramApplicationStatus" ADD VALUE 'AUTO_REJECTED';
ALTER TYPE "ProgramApplicationStatus" ADD VALUE 'CANCELLED';
ALTER TABLE "notifications" ADD COLUMN "link_url" TEXT;
