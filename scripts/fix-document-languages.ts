import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config();

const prisma = new PrismaClient();

function detectLanguage(text: string): "zh" | "en" {
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
  return chineseChars && chineseChars.length > text.length * 0.3 ? "zh" : "en";
}

async function fixDocuments() {
  const docs = await prisma.document.findMany();

  for (const doc of docs) {
    const needsFixTitle = !doc.titleZh || !doc.titleEn;
    const needsFixContent = !doc.contentZh || !doc.contentEn;

    if (needsFixTitle || needsFixContent) {
      console.log(`Fixing document ${doc.id}...`);

      const updates: any = {};

      if (needsFixTitle) {
        const titleLang = detectLanguage(doc.titleZh || doc.titleEn);
        if (titleLang === "zh") {
          updates.titleZh = doc.titleZh || doc.titleEn;
          updates.titleEn = "";
        } else {
          updates.titleEn = doc.titleZh || doc.titleEn;
          updates.titleZh = "";
        }
      }

      if (needsFixContent) {
        const contentLang = detectLanguage(doc.contentZh || doc.contentEn);
        if (contentLang === "zh") {
          updates.contentZh = doc.contentZh || doc.contentEn;
          updates.contentEn = "";
        } else {
          updates.contentEn = doc.contentZh || doc.contentEn;
          updates.contentZh = "";
        }
      }

      await prisma.document.update({
        where: { id: doc.id },
        data: updates
      });

      console.log(`Fixed: ${JSON.stringify(updates)}`);
    }
  }

  console.log("Done!");
}

fixDocuments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
