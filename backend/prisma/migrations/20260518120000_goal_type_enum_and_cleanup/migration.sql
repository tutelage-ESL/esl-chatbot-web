-- GoalType enum + Goal table cleanup
-- Truncate first so we can safely retype the 'type' column (dev data only; re-seed after)
TRUNCATE TABLE "goals";

-- Create GoalType enum
CREATE TYPE "GoalType" AS ENUM ('VOCABULARY', 'SPEAKING', 'GRAMMAR', 'CONVERSATION', 'STUDY_TIME');

-- Convert type column from text to GoalType enum
ALTER TABLE "goals" ALTER COLUMN "type" TYPE "GoalType" USING "type"::"GoalType";

-- Remove timeframe (redundant with startDate / targetDate)
ALTER TABLE "goals" DROP COLUMN "timeframe";

-- Remove milestones (not implemented yet; will be added in Phase 6 if needed)
ALTER TABLE "goals" DROP COLUMN "milestones";
