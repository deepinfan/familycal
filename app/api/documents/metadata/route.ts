import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (auth.isAdmin) {
      return NextResponse.json({ error: "管理员仅可访问后台" }, { status: 403 });
    }

    const documents = await prisma.document.findMany({
      where: {
        OR: [{ creatorId: auth.roleId }, { visibleTo: { some: { roleId: auth.roleId } } }]
      },
      select: {
        id: true,
        titleZh: true,
        titleEn: true,
        creatorId: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { updatedAt: "desc" }
    });

    const lang = request.headers.get("accept-language")?.includes("zh") ? "zh" : "en";

    return NextResponse.json({
      currentRoleId: auth.roleId,
      documents: documents.map((doc) => ({
        id: doc.id,
        title: lang === "zh" ? doc.titleZh : doc.titleEn,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      }))
    });
  } catch (error) {
    console.error("Documents metadata API error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
