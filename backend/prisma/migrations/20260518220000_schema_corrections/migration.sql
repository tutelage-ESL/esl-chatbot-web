-- CreateEnum: ClassRole (replaces Role on ClassUser — ADMIN is not a valid class-membership role)
CREATE TYPE "ClassRole" AS ENUM ('STUDENT', 'TUTOR');

-- AlterTable: class_users.role — cast from Role to ClassRole via text.
-- Existing data only contains STUDENT and TUTOR values; ADMIN was never inserted.
ALTER TABLE "class_users" ALTER COLUMN "role" TYPE "ClassRole" USING "role"::text::"ClassRole";

-- CreateEnum: GoalDifficulty (replaces freetext String with a proper enum)
CREATE TYPE "GoalDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXPERT');

-- Data migration: uppercase existing lowercase difficulty strings before the enum cast
UPDATE "goals" SET "difficulty" = UPPER("difficulty") WHERE "difficulty" IS NOT NULL;

-- AlterTable: goals.difficulty — cast from text to GoalDifficulty enum
ALTER TABLE "goals" ALTER COLUMN "difficulty" TYPE "GoalDifficulty" USING "difficulty"::"GoalDifficulty";

-- AlterTable: session_evaluations — add avgPronunciationScore (nullable: null for text sessions)
ALTER TABLE "session_evaluations" ADD COLUMN "avgPronunciationScore" DOUBLE PRECISION;

-- AlterTable: conversation_sessions — drop averageScore (redundant with SessionEvaluation.avgOverallScore)
ALTER TABLE "conversation_sessions" DROP COLUMN "averageScore";

-- CreateIndex: userId on password_reset_tokens (speeds up deleteMany-by-user on new OTP request)
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex: userId on refresh_tokens (speeds up deleteMany-by-user on logout-all-devices)
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
