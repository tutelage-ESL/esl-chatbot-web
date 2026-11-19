-- The tutor's voice, chosen by the learner: American or British, female or male.
CREATE TYPE "TutorAccent" AS ENUM ('US', 'GB');
CREATE TYPE "VoiceGender" AS ENUM ('FEMALE', 'MALE');
ALTER TABLE "learner_profiles" ADD COLUMN "tutorAccent" "TutorAccent" NOT NULL DEFAULT 'US';
ALTER TABLE "learner_profiles" ADD COLUMN "tutorVoice" "VoiceGender" NOT NULL DEFAULT 'FEMALE';
