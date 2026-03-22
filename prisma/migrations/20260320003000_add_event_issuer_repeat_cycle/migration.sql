ALTER TABLE "public"."Event"
ADD COLUMN "repeatCycle" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN "issuedById" TEXT;

UPDATE "public"."Event"
SET "issuedById" = "creatorId"
WHERE "issuedById" IS NULL;

ALTER TABLE "public"."Event"
ALTER COLUMN "issuedById" SET NOT NULL;

ALTER TABLE "public"."Event"
ADD CONSTRAINT "Event_issuedById_fkey"
FOREIGN KEY ("issuedById") REFERENCES "public"."Role"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
