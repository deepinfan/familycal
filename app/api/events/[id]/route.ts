import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/lib/auth";
import { REPEAT_CYCLES } from "@/lib/events/recurrence";
import { notifyRoles } from "@/lib/push/webpush";
import { prisma } from "@/lib/prisma";
import { translateWithFallback } from "@/lib/translate";

const patchSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("edit"),
    titleZh: z.string().min(1),
    titleEn: z.string().optional().default(""),
    datetime: z.string().datetime(),
    type: z.string().min(1),
    repeatCycle: z.enum(REPEAT_CYCLES).optional().default("none"),
    repeatUntil: z.string().datetime().nullable().optional().default(null),
    issuedByRoleId: z.string().min(1),
    assigneeRoleIds: z.array(z.string()).optional().default([]),
    assigneeAll: z.boolean().optional().default(false)
  }),
  z.object({
    mode: z.literal("status"),
    status: z.enum(["pending", "done", "cancelled"])
  })
]).superRefine((data, ctx) => {
  if (data.mode === "edit" && data.repeatCycle !== "none" && !data.repeatUntil) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["repeatUntil"],
      message: "重复任务必须设置截止日期"
    });
  }
  if (data.mode === "edit" && data.repeatCycle !== "none" && data.repeatUntil) {
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

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (auth.isAdmin) {
    return NextResponse.json({ error: "管理员仅可访问后台" }, { status: 403 });
  }

  const { id } = await context.params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: { assignees: true }
  });

  if (!event) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }

  if (parsed.data.mode === "edit") {
    if (event.creatorId !== auth.roleId) {
      return NextResponse.json({ error: "仅创建者可修改任务" }, { status: 403 });
    }

    const allRoleIds = parsed.data.assigneeAll
      ? (await prisma.role.findMany({ where: { isAdmin: false }, select: { id: true } })).map((r) => r.id)
      : parsed.data.assigneeRoleIds;

    const dedupRoleIds = Array.from(new Set(allRoleIds));
    if (dedupRoleIds.length === 0) {
      return NextResponse.json({ error: "至少选择一个负责人" }, { status: 400 });
    }

    const validCount = await prisma.role.count({ where: { id: { in: dedupRoleIds }, isAdmin: false } });
    if (validCount !== dedupRoleIds.length) {
      return NextResponse.json({ error: "负责人包含无效角色" }, { status: 400 });
    }

    const issuedByRole = await prisma.role.findFirst({
      where: { id: parsed.data.issuedByRoleId, isAdmin: false },
      select: { id: true }
    });
    if (!issuedByRole) {
      return NextResponse.json({ error: "任务下达人无效" }, { status: 400 });
    }

    const titleEn = parsed.data.titleEn || "";

    await prisma.$transaction([
      prisma.eventAssignee.deleteMany({ where: { eventId: id } }),
      prisma.event.update({
        where: { id },
        data: {
          titleZh: parsed.data.titleZh,
          titleEn,
          datetime: new Date(parsed.data.datetime),
          type: parsed.data.type,
          repeatCycle: parsed.data.repeatCycle,
          repeatUntil: parsed.data.repeatUntil ? new Date(parsed.data.repeatUntil) : null,
          issuedById: parsed.data.issuedByRoleId
        }
      }),
      prisma.eventAssignee.createMany({
        data: dedupRoleIds.map((roleId) => ({ eventId: id, roleId }))
      })
    ]);

    // 异步翻译
    if (!parsed.data.titleEn) {
      translateWithFallback(parsed.data.titleZh, "en").then((translated) => {
        prisma.event.update({
          where: { id },
          data: { titleEn: translated }
        }).catch(() => {});
      }).catch(() => {});
    }

    void notifyRoles(dedupRoleIds, {
      title: "HomeCal 任务更新",
      body: `任务已更新：${parsed.data.titleZh}`
    });

    return NextResponse.json({ ok: true });
  }

  const isAssignee = event.assignees.some((item) => item.roleId === auth.roleId);
  if (!isAssignee) {
    return NextResponse.json({ error: "仅负责人可变更任务状态" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.event.update({
      where: { id },
      data: {
        status: parsed.data.status
      }
    }),
    prisma.eventLog.create({
      data: {
        eventId: id,
        actorId: auth.roleId,
        action: parsed.data.status
      }
    })
  ]);

  void notifyRoles(
    event.assignees.map((item) => item.roleId),
    {
      title: "HomeCal 任务状态变更",
      body: `任务状态更新为：${parsed.data.status}`
    }
  );

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
  const event = await prisma.event.findUnique({ where: { id }, select: { creatorId: true } });
  if (!event) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  if (event.creatorId !== auth.roleId) {
    return NextResponse.json({ error: "仅创建者可删除任务" }, { status: 403 });
  }

  const assignees = await prisma.eventAssignee.findMany({
    where: { eventId: id },
    select: { roleId: true }
  });

  await prisma.$transaction([
    prisma.eventLog.deleteMany({ where: { eventId: id } }),
    prisma.eventAssignee.deleteMany({ where: { eventId: id } }),
    prisma.event.delete({ where: { id } })
  ]);

  void notifyRoles(
    assignees.map((item) => item.roleId),
    {
      title: "HomeCal 任务删除",
      body: "有一条任务已被删除"
    }
  );

  return NextResponse.json({ ok: true });
}
