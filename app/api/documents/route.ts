import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectLanguage } from "@/lib/lang-detect";

const createDocumentSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  visibleRoleIds: z.array(z.string()).optional().default([]),
  visibleAll: z.boolean().optional().default(false),
  attachments: z.array(z.object({
    filename: z.string(),
    filepath: z.string(),
    thumbnail: z.string().nullable().optional(),
    mimetype: z.string(),
    size: z.number()
  })).optional().default([])
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (auth.isAdmin) {
      return NextResponse.json({ error: "管理员仅可访问后台" }, { status: 403 });
    }

    const [roles, documents] = await Promise.all([
      prisma.role.findMany({
        where: { isAdmin: false },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" }
      }),
      prisma.document.findMany({
        where: {
          OR: [{ creatorId: auth.roleId }, { visibleTo: { some: { roleId: auth.roleId } } }]
        },
        include: {
          creator: { select: { id: true, name: true } },
          visibleTo: { include: { role: { select: { id: true, name: true } } } },
          attachments: true
        },
        orderBy: { updatedAt: "desc" }
      })
    ]);

    const lang = request.headers.get("accept-language")?.includes("zh") ? "zh" : "en";

    return NextResponse.json({
      currentRoleId: auth.roleId,
      roles,
      documents: documents.map((doc) => ({
        id: doc.id,
        title: lang === "zh" ? doc.titleZh : doc.titleEn,
        creator: doc.creator,
        visibleRoles: doc.visibleTo.map((item) => item.role),
        attachments: doc.attachments,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      }))
    });
  } catch (error) {
    console.error("Documents API error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (auth.isAdmin) {
    return NextResponse.json({ error: "管理员仅可访问后台" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createDocumentSchema.safeParse(body);
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

  const titleLang = detectLanguage(parsed.data.title);
  const contentLang = detectLanguage(parsed.data.content);

  const doc = await prisma.document.create({
    data: {
      titleZh: titleLang === "zh" ? parsed.data.title : "",
      titleEn: titleLang === "en" ? parsed.data.title : "",
      contentZh: contentLang === "zh" ? parsed.data.content : "",
      contentEn: contentLang === "en" ? parsed.data.content : "",
      creatorId: auth.roleId,
      visibleTo: {
        createMany: {
          data: dedupRoleIds.map((roleId) => ({ roleId }))
        }
      },
      attachments: {
        createMany: {
          data: parsed.data.attachments
        }
      }
    }
  });

  return NextResponse.json({ documentId: doc.id });
}
