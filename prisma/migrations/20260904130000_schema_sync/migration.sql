-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "automationsPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "businessHoursEnd" INTEGER,
ADD COLUMN     "businessHoursStart" INTEGER,
ADD COLUMN     "holidays" JSONB,
ADD COLUMN     "workingDays" JSONB;

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "showBrokenPromiseBanner" BOOLEAN NOT NULL DEFAULT true,
    "showQueueWhy" BOOLEAN NOT NULL DEFAULT true,
    "emailDailyDigest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "IdempotencyKey_organizationId_idx" ON "IdempotencyKey"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_organizationId_key_key" ON "IdempotencyKey"("organizationId", "key");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

