import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  visibleRoleIds: z.array(z.string()).optional().default([]),
  visibleAll: z.boolean().optional().default(false),
  keepAttachmentIds: z.array(z.string()).optional().default([]),
  newAttachments: z.array(z.object({
    filename: z.string(),
    filepath: z.string(),
    mimetype: z.string(),
    size: z.number()
  })).optional().default([])
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (auth.isAdmin) {
    return NextResponse.json({ error: "管理员仅可访问后台" }, { status: 403 });
  }

  const { id } = await context.params;
  const doc = await prisma.document.findUnique({ where: { id }, select: { creatorId: true } });
  if (!doc) {
    return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  }
  if (doc.creatorId !== auth.roleId) {
    return NextResponse.json({ error: "仅创建者可修改文档" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }

  const visibleRoleIds = parsed.data.visibleAll
    ? (await prisma.role.findMany({ where: { isAdmin: false }, select: { id: true } })).map((r) => r.id)
    : parsed.data.visibleRoleIds;

  const dedupRoleIds = Array.from(new Set(visibleRoleIds));
  if (dedupRoleIds.length === 0) {
    return NextResponse.json({ error: "至少选择一个可见角色" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.documentVisibility.deleteMany({ where: { documentId: id } }),
    prisma.attachment.deleteMany({
      where: {
        documentId: id,
        id: { notIn: parsed.data.keepAttachmentIds }
      }
    }),
    prisma.document.update({
      where: { id },
      data: {
        title: parsed.data.title,
        content: parsed.data.content,
        attachments: {
          createMany: {
            data: parsed.data.newAttachments
          }
        }
      }
    }),
    prisma.documentVisibility.createMany({
      data: dedupRoleIds.map((roleId) => ({ documentId: id, roleId }))
    })
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (auth.isAdmin) {
    return NextResponse.json({ error: "管理员仅可访问后台" }, { status: 403 });
  }

  const { id } = await context.params;
  const doc = await prisma.document.findUnique({ where: { id }, select: { creatorId: true } });
  if (!doc) {
    return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  }

  if (doc.creatorId !== auth.roleId) {
    return NextResponse.json({ error: "仅创建者可删除文档" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.documentVisibility.deleteMany({ where: { documentId: id } }),
    prisma.document.delete({ where: { id } })
  ]);
  return NextResponse.json({ ok: true });
}
