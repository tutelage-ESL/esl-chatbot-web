-- CreateTable
CREATE TABLE "user_agreements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "ipAddress" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_agreements_userId_idx" ON "user_agreements"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_agreements_userId_version_key" ON "user_agreements"("userId", "version");

-- AddForeignKey
ALTER TABLE "user_agreements" ADD CONSTRAINT "user_agreements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
