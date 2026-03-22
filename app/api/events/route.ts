import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/lib/auth";
import { buildRecurringDates, REPEAT_CYCLES } from "@/lib/events/recurrence";
import { notifyRoles } from "@/lib/push/webpush";
import { prisma } from "@/lib/prisma";
import { translateWithFallback } from "@/lib/translate";

const createEventSchema = z.object({
  titleZh: z.string().min(1),
  titleEn: z.string().optional().default(""),
  datetime: z.string().datetime(),
  type: z.string().min(1),
  repeatCycle: z.enum(REPEAT_CYCLES).optional().default("none"),
  repeatUntil: z.string().datetime().nullable().optional().default(null),
  issuedByRoleId: z.string().min(1).optional(),
  assigneeRoleIds: z.array(z.string()).optional().default([]),
  assigneeAll: z.boolean().optional().default(false)
}).superRefine((data, ctx) => {
  if (data.repeatCycle !== "none" && !data.repeatUntil) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["repeatUntil"],
      message: "重复任务必须设置截止日期"
    });
  }
  if (data.repeatCycle !== "none" && data.repeatUntil) {
    const startAt = new Date(data.datetime);
    const endAt = new Date(data.repeatUntil);
    if (endAt < startAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["repeatUntil"],
        message: "重复截止日期不能早于任务时间"
      });
    }
  }
});

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (auth.isAdmin) {
    return NextResponse.json({ error: "管理员仅可访问后台" }, { status: 403 });
  }

  const [roles, events] = await Promise.all([
    prisma.role.findMany({
      where: { isAdmin: false },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" }
    }),
    prisma.event.findMany({
      include: {
        creator: { select: { id: true, name: true, nameEn: true } },
        issuedBy: { select: { id: true, name: true, nameEn: true } },
        assignees: { include: { role: { select: { id: true, name: true, nameEn: true } } } }
      },
      orderBy: { datetime: "asc" }
    })
  ]);

  const result = events.map((event) => ({
    id: event.id,
    titleZh: event.titleZh,
    titleEn: event.titleEn,
    datetime: event.datetime,
    type: event.type,
    repeatCycle: event.repeatCycle,
    repeatUntil: event.repeatUntil,
    status: event.status === "extended" ? "pending" : event.status,
    creator: event.creator,
    issuedBy: event.issuedBy,
    assignees: event.assignees.map((item) => item.role),
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  }));

  return NextResponse.json({ currentRoleId: auth.roleId, roles, events: result });
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
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }

  const data = parsed.data;
  const allRoleIds = data.assigneeAll
    ? (await prisma.role.findMany({ where: { isAdmin: false }, select: { id: true } })).map((r) => r.id)
    : data.assigneeRoleIds;

  const dedupRoleIds = Array.from(new Set(allRoleIds));
  if (dedupRoleIds.length === 0) {
    return NextResponse.json({ error: "至少选择一个负责人" }, { status: 400 });
  }

  const validCount = await prisma.role.count({ where: { id: { in: dedupRoleIds }, isAdmin: false } });
  if (validCount !== dedupRoleIds.length) {
    return NextResponse.json({ error: "负责人包含无效角色" }, { status: 400 });
  }

  const issuedByRoleId = data.issuedByRoleId ?? auth.roleId;
  const issuedByRole = await prisma.role.findFirst({
    where: { id: issuedByRoleId, isAdmin: false },
    select: { id: true }
  });
  if (!issuedByRole) {
    return NextResponse.json({ error: "任务下达人无效" }, { status: 400 });
  }

  const repeatUntil = data.repeatUntil ? new Date(data.repeatUntil) : null;
  const recurrenceDates = buildRecurringDates(new Date(data.datetime), data.repeatCycle, repeatUntil);
  const titleEn = data.titleEn || "";

  const [firstCreated] = await prisma.$transaction(
    recurrenceDates.map((eventDate) =>
      prisma.event.create({
        data: {
          titleZh: data.titleZh,
          titleEn,
          datetime: eventDate,
          type: data.type,
          repeatCycle: data.repeatCycle,
          repeatUntil,
          creatorId: auth.roleId,
          issuedById: issuedByRoleId,
          assignees: {
            createMany: {
              data: dedupRoleIds.map((roleId) => ({ roleId }))
            }
          }
        },
        include: {
          creator: { select: { id: true, name: true, nameEn: true } },
          issuedBy: { select: { id: true, name: true, nameEn: true } },
          assignees: { include: { role: { select: { id: true, name: true, nameEn: true } } } }
        }
      })
    )
  );

  // 异步翻译，不阻塞响应
  if (!data.titleEn) {
    translateWithFallback(data.titleZh, "en").then((translated) => {
      prisma.event.updateMany({
        where: {
          titleZh: data.titleZh,
          creatorId: auth.roleId,
          titleEn: ""
        },
        data: { titleEn: translated }
      }).catch(() => {});
    }).catch(() => {});
  }

  void notifyRoles(dedupRoleIds, {
    title: "HomeCal 新任务",
    body:
      recurrenceDates.length > 1
        ? `${firstCreated.titleZh}，已生成 ${recurrenceDates.length} 条周期任务`
        : `${firstCreated.titleZh} (${new Date(firstCreated.datetime).toLocaleString("zh-CN", { hour12: false })})`
  });

  return NextResponse.json({
    event: {
      id: firstCreated.id,
      titleZh: firstCreated.titleZh,
      titleEn: firstCreated.titleEn,
      datetime: firstCreated.datetime,
      type: firstCreated.type,
      repeatCycle: firstCreated.repeatCycle,
      repeatUntil: firstCreated.repeatUntil,
      status: firstCreated.status,
      creator: firstCreated.creator,
      issuedBy: firstCreated.issuedBy,
      assignees: firstCreated.assignees.map((item) => item.role),
      createdAt: firstCreated.createdAt,
      updatedAt: firstCreated.updatedAt
    },
    createdCount: recurrenceDates.length
  });
}
