-- AlterTable
ALTER TABLE "Role" ADD COLUMN "calendarSubscriptionKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Role_calendarSubscriptionKey_key" ON "Role"("calendarSubscriptionKey");
