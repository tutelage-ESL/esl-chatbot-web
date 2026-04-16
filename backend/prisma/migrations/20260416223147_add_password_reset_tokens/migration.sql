/*
  Warnings:

  - You are about to drop the column `aiEvaluation` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `inputMode` on the `messages` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'VOICE');

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "aiEvaluation",
DROP COLUMN "inputMode",
ADD COLUMN     "audioDurationSec" DOUBLE PRECISION,
ADD COLUMN     "type" "MessageType" NOT NULL DEFAULT 'TEXT';

-- CreateTable
CREATE TABLE "message_evaluations" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "grammarScore" INTEGER NOT NULL,
    "grammarErrors" JSONB NOT NULL,
    "vocabularyScore" INTEGER NOT NULL,
    "vocabularyLevel" TEXT NOT NULL,
    "fluencyScore" INTEGER NOT NULL,
    "pronunciationScore" INTEGER,
    "pronunciationIssues" JSONB,
    "overallScore" INTEGER NOT NULL,
    "detectedCefrLevel" TEXT NOT NULL,
    "corrections" JSONB NOT NULL,
    "feedback" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_evaluations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "topicsCovered" JSONB NOT NULL,
    "avgGrammarScore" DOUBLE PRECISION NOT NULL,
    "avgVocabularyScore" DOUBLE PRECISION NOT NULL,
    "avgFluencyScore" DOUBLE PRECISION NOT NULL,
    "avgOverallScore" DOUBLE PRECISION NOT NULL,
    "detectedCefrLevel" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "newVocabulary" JSONB NOT NULL,
    "totalUserMessages" INTEGER NOT NULL,
    "totalUserWords" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_evaluations_messageId_key" ON "message_evaluations"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "session_evaluations_sessionId_key" ON "session_evaluations"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_otpHash_key" ON "password_reset_tokens"("otpHash");

-- AddForeignKey
ALTER TABLE "message_evaluations" ADD CONSTRAINT "message_evaluations_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_evaluations" ADD CONSTRAINT "session_evaluations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "conversation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
