-- UserMetrics: remove uncomputable/premature skill fields, add fluencySkill
ALTER TABLE "user_metrics" DROP COLUMN IF EXISTS "lessonsCompleted";
ALTER TABLE "user_metrics" DROP COLUMN IF EXISTS "readingSkill";
ALTER TABLE "user_metrics" DROP COLUMN IF EXISTS "writingSkill";
ALTER TABLE "user_metrics" DROP COLUMN IF EXISTS "listeningSkill";
ALTER TABLE "user_metrics" ADD COLUMN IF NOT EXISTS "fluencySkill" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Progress: add sessionsCount for daily session tracking
ALTER TABLE "progress" ADD COLUMN IF NOT EXISTS "sessionsCount" INTEGER NOT NULL DEFAULT 0;

-- Vocabulary: add VocabSource enum and source column
CREATE TYPE "VocabSource" AS ENUM ('MANUAL', 'SESSION');
ALTER TABLE "vocabularies" ADD COLUMN IF NOT EXISTS "source" "VocabSource" NOT NULL DEFAULT 'MANUAL';
