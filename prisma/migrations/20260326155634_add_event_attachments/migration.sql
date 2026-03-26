-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN "eventId" TEXT,
ALTER COLUMN "documentId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Attachment_eventId_idx" ON "Attachment"("eventId");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
