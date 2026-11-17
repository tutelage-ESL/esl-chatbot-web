-- Chat list management: an AI-given title the learner can rename, pinning, and
-- "delete" as a soft hide (deletedAt) so a deleted chat still counts toward the
-- daily session/message limits and stays in tutor/admin history.
--
-- IF NOT EXISTS because dev is kept in sync with `db push` while prod runs
-- `migrate deploy` — this keeps the migration idempotent on both.
ALTER TABLE "conversation_sessions" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "conversation_sessions" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "conversation_sessions" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
