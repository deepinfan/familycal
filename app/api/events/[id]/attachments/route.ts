import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await context.params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      assignees: { select: { roleId: true } },
      issuedBy: { select: { id: true } }
    }
  });

  if (!event) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const isAssignee = event.assignees.some(a => a.roleId === auth.roleId);
  const isIssuer = event.issuedBy.id === auth.roleId;

  if (!isAssignee && !isIssuer) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const attachments = await prisma.attachment.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ attachments });
}
