import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await context.params;
  const doc = await prisma.document.findUnique({
    where: { id },
    select: {
      contentZh: true,
      contentEn: true,
      creatorId: true,
      visibleTo: { select: { roleId: true } }
    }
  });

  if (!doc) {
    return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  }

  const hasAccess = doc.creatorId === auth.roleId || doc.visibleTo.some((v) => v.roleId === auth.roleId);
  if (!hasAccess) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const lang = request.headers.get("accept-language")?.includes("zh") ? "zh" : "en";
  return NextResponse.json({
    content: lang === "zh" ? doc.contentZh : doc.contentEn
  });
}
