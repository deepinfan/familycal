-- AlterTable
ALTER TABLE "Document" RENAME COLUMN "title" TO "titleZh";
ALTER TABLE "Document" RENAME COLUMN "content" TO "contentZh";
ALTER TABLE "Document" ADD COLUMN "titleEn" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Document" ADD COLUMN "contentEn" TEXT NOT NULL DEFAULT '';
