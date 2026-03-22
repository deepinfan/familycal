import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { translateWithFallback } from "@/lib/translate";

const createRoleSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional().default(""),
  password: z.string().min(6),
  isAdmin: z.boolean().optional().default(false)
});

export async function GET(request: NextRequest) {
  const authz = await requireAdmin(request);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const roles = await prisma.role.findMany({
    select: {
      id: true,
      name: true,
      nameEn: true,
      isAdmin: true,
      createdAt: true
    },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ roles });
}

export async function POST(request: NextRequest) {
  const authz = await requireAdmin(request);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }

  const hash = await bcrypt.hash(parsed.data.password, 10);
  const nameEn = parsed.data.nameEn || "";
  const role = await prisma.role.create({
    data: {
      name: parsed.data.name,
      nameEn,
      passwordHash: hash,
      isAdmin: parsed.data.isAdmin
    },
    select: { id: true, name: true, nameEn: true, isAdmin: true, createdAt: true }
  });

  // 异步翻译
  if (!parsed.data.nameEn) {
    translateWithFallback(parsed.data.name, "en").then((translated) => {
      prisma.role.update({
        where: { id: role.id },
        data: { nameEn: translated }
      }).catch(() => {});
    }).catch(() => {});
  }

  return NextResponse.json({ role });
}
