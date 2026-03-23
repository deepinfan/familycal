import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { filename } = await context.params;

  const attachment = await prisma.attachment.findFirst({
    where: {
      OR: [
        { filepath: `/uploads/${filename}` },
        { filepath: { contains: filename } }
      ]
    },
    include: {
      document: {
        include: {
          visibleTo: true
        }
      }
    }
  });

  if (!attachment) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const hasAccess =
    attachment.document.creatorId === auth.roleId ||
    attachment.document.visibleTo.some((v) => v.roleId === auth.roleId);

  if (!hasAccess) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  // 重定向到 Blob URL
  return NextResponse.redirect(attachment.filepath);
}
