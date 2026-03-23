import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectLanguage } from "@/lib/lang-detect";
import { translateWithFallback } from "@/lib/translate";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const docs = await prisma.document.findMany();
    const fixed = [];

    for (const doc of docs) {
      const needsFixTitle = !doc.titleZh || !doc.titleEn;
      const needsFixContent = !doc.contentZh || !doc.contentEn;

      if (needsFixTitle || needsFixContent) {
        const updates: any = {};

        if (needsFixTitle) {
          const titleText = doc.titleZh || doc.titleEn;
          const titleLang = detectLanguage(titleText);
          if (titleLang === "zh") {
            updates.titleZh = titleText;
            updates.titleEn = await translateWithFallback(titleText, "en");
          } else {
            updates.titleEn = titleText;
            updates.titleZh = await translateWithFallback(titleText, "zh");
          }
        }

        if (needsFixContent) {
          const contentText = doc.contentZh || doc.contentEn;
          const contentLang = detectLanguage(contentText);
          if (contentLang === "zh") {
            updates.contentZh = contentText;
            updates.contentEn = await translateWithFallback(contentText, "en");
          } else {
            updates.contentEn = contentText;
            updates.contentZh = await translateWithFallback(contentText, "zh");
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
