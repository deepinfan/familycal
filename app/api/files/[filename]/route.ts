import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
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
    where: { filepath: `/uploads/${filename}` },
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

  try {
    const filepath = join(process.cwd(), "public", "uploads", filename);
    const file = await readFile(filepath);

    return new NextResponse(file, {
      headers: {
        "Content-Type": attachment.mimetype,
        "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.filename)}"`
      }
    });
  } catch {
    return NextResponse.json({ error: "文件读取失败" }, { status: 500 });
  }
}
