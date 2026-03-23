import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectLanguage } from "@/lib/lang-detect";

export async function POST(request: NextRequest) {
  try {
    const docs = await prisma.document.findMany();
    const fixed = [];

    for (const doc of docs) {
      const needsFixTitle = !doc.titleZh || !doc.titleEn;
      const needsFixContent = !doc.contentZh || !doc.contentEn;

      if (needsFixTitle || needsFixContent) {
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

        fixed.push({ id: doc.id, updates });
      }
    }

    return NextResponse.json({ success: true, fixed });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
