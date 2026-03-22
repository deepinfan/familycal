import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { translateWithFallback } from "@/lib/translate";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  nameEn: z.string().optional(),
  password: z.string().min(6).optional()
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authz = await requireAdmin(request);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }

  const currentRole = await prisma.role.findUnique({
    where: { id },
    select: { isAdmin: true }
  });
  if (!currentRole) {
    return NextResponse.json({ error: "角色不存在" }, { status: 404 });
  }

  const isProfileEdit = parsed.data.name !== undefined || parsed.data.nameEn !== undefined;
  if (currentRole.isAdmin && isProfileEdit) {
    return NextResponse.json({ error: "管理员不允许编辑名称，仅可修改密码" }, { status: 403 });
  }

  const data: { name?: string; nameEn?: string; passwordHash?: string } = {};
  if (parsed.data.name) data.name = parsed.data.name;
  if (parsed.data.nameEn !== undefined) {
    data.nameEn = parsed.data.nameEn || "";
  } else if (parsed.data.name) {
    data.nameEn = "";
  }
  if (parsed.data.password) data.passwordHash = await bcrypt.hash(parsed.data.password, 10);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "无更新字段" }, { status: 400 });
  }

  const role = await prisma.role.update({
    where: { id },
    data,
    select: { id: true, name: true, nameEn: true, isAdmin: true }
  });

  // 异步翻译
  if (parsed.data.name && !parsed.data.nameEn) {
    translateWithFallback(parsed.data.name, "en").then((translated) => {
      prisma.role.update({
        where: { id },
        data: { nameEn: translated }
      }).catch(() => {});
    }).catch(() => {});
  }

  return NextResponse.json({ role });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authz = await requireAdmin(request);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const { id } = await context.params;
  const role = await prisma.role.findUnique({ where: { id }, select: { isAdmin: true } });
  if (!role) {
    return NextResponse.json({ error: "角色不存在" }, { status: 404 });
  }

  if (role.isAdmin) {
    return NextResponse.json({ error: "管理员不允许删除，仅可修改密码" }, { status: 403 });
  }

  const deleted = await prisma.role.delete({ where: { id } }).catch(() => null);
  if (!deleted) {
    return NextResponse.json({ error: "角色已被任务/文档引用，无法删除" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
