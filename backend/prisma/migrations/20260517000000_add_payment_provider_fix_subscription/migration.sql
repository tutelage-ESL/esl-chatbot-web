-- CreateEnum: payment provider for subscription tracking (CASH/FIB/STRIPE)
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'FIB', 'CASH');

-- Rename legacy Stripe-named columns to provider-agnostic names
ALTER TABLE "subscriptions" RENAME COLUMN "stripeCustomerId" TO "externalCustomerId";
ALTER TABLE "subscriptions" RENAME COLUMN "stripeSubscriptionId" TO "externalSubscriptionId";

-- Add paymentProvider column
ALTER TABLE "subscriptions" ADD COLUMN "paymentProvider" "PaymentProvider";

-- Fix subscription status default: new users start INACTIVE until verified (Google link)
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'INACTIVE'::"SubStatus";
