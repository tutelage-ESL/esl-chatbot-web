-- The AI tutor's long-term memory about a learner: a short list of facts (string[]) the model manages itself.
ALTER TABLE "learner_profiles" ADD COLUMN "aiMemory" JSONB;
