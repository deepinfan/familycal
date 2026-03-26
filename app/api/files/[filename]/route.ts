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
      },
      event: {
        include: {
          assignees: { select: { roleId: true } },
          issuedBy: { select: { id: true } }
        }
      }
    }
  });

  if (!attachment) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  let hasAccess = false;

  if (attachment.document) {
    hasAccess =
      attachment.document.creatorId === auth.roleId ||
      attachment.document.visibleTo.some((v) => v.roleId === auth.roleId);
  } else if (attachment.event) {
    const isAssignee = attachment.event.assignees.some((a) => a.roleId === auth.roleId);
    const isIssuer = attachment.event.issuedBy.id === auth.roleId;
    hasAccess = isAssignee || isIssuer;
  }

  if (!hasAccess) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  // 检查 ETag
  const etag = `"${attachment.id}"`;
  const ifNoneMatch = request.headers.get('if-none-match');

  if (ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304 });
  }

  // 重定向到 Blob URL，添加缓存头
  return NextResponse.redirect(attachment.filepath, {
    headers: {
      'Cache-Control': 'private, max-age=3600',
      'ETag': etag
    }
  });
}
