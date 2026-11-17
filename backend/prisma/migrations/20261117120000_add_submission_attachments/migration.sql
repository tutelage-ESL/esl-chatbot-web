-- AlterTable
ALTER TABLE "task_attachments" ADD COLUMN     "submissionId" TEXT;

-- CreateIndex
CREATE INDEX "task_attachments_submissionId_idx" ON "task_attachments"("submissionId");

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "task_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

