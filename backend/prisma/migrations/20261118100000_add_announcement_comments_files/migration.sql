-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ANNOUNCEMENT_COMMENT';

-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "editedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "announcement_comments" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcement_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_attachments" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcement_comments_announcementId_createdAt_idx" ON "announcement_comments"("announcementId", "createdAt");

-- CreateIndex
CREATE INDEX "announcement_attachments_announcementId_idx" ON "announcement_attachments"("announcementId");

-- AddForeignKey
ALTER TABLE "announcement_comments" ADD CONSTRAINT "announcement_comments_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_comments" ADD CONSTRAINT "announcement_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_attachments" ADD CONSTRAINT "announcement_attachments_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_attachments" ADD CONSTRAINT "announcement_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
