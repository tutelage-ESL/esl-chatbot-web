-- The dashboard guide (product tour) is shown once per account: when it was finished or skipped.
ALTER TABLE "users" ADD COLUMN "guideSeenAt" TIMESTAMP(3);
