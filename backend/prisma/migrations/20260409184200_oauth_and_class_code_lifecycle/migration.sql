-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');

-- DropForeignKey
ALTER TABLE "enrollment_requests" DROP CONSTRAINT "enrollment_requests_classCode_fkey";

-- DropForeignKey
ALTER TABLE "enrollment_requests" DROP CONSTRAINT "enrollment_requests_resolverId_fkey";

-- DropForeignKey
ALTER TABLE "enrollment_requests" DROP CONSTRAINT "enrollment_requests_userId_fkey";

-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "classCodeBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "classCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "classCodeRefreshIntervalSeconds" INTEGER,
ADD COLUMN     "classCodeRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "authProvider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
ADD COLUMN     "googleId" TEXT,
ALTER COLUMN "password" DROP NOT NULL;

-- DropTable
DROP TABLE "enrollment_requests";

-- DropEnum
DROP TYPE "EnrollStatus";

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
