-- AiPersonality enum for learner_profiles.aiPersonality

-- Create the enum
CREATE TYPE "AiPersonality" AS ENUM ('FRIENDLY', 'FORMAL', 'CASUAL', 'ENCOURAGING', 'STRICT', 'PATIENT');

-- Uppercase existing values so the USING cast succeeds (dev seed used lowercase)
UPDATE "learner_profiles" SET "aiPersonality" = UPPER("aiPersonality") WHERE "aiPersonality" IS NOT NULL;

-- Convert column from text to AiPersonality enum
ALTER TABLE "learner_profiles" ALTER COLUMN "aiPersonality" TYPE "AiPersonality" USING "aiPersonality"::"AiPersonality";
