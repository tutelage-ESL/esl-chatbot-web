-- AlterTable
ALTER TABLE "learner_profiles" ADD COLUMN     "digestLastSentAt" TIMESTAMP(3),
ADD COLUMN     "emailDigestEnabled" BOOLEAN NOT NULL DEFAULT true;
