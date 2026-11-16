-- CreateEnum
CREATE TYPE "FibSubStatus" AS ENUM ('DRAFT', 'TRIAL', 'ACTIVE', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "fib_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fibSubscriptionId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "intervalMonths" INTEGER NOT NULL,
    "amountIQD" INTEGER NOT NULL,
    "fibStatus" "FibSubStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fib_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fib_subscriptions_fibSubscriptionId_key" ON "fib_subscriptions"("fibSubscriptionId");

-- CreateIndex
CREATE INDEX "fib_subscriptions_userId_idx" ON "fib_subscriptions"("userId");

-- AddForeignKey
ALTER TABLE "fib_subscriptions" ADD CONSTRAINT "fib_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
