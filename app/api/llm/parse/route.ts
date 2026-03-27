import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/lib/auth";
import { getDecryptedLlmApiKey, getSystemConfig } from "@/lib/config/system-config";
import { prisma } from "@/lib/prisma";
import { parseWithRouter } from "@/lib/parser/router";

const bodySchema = z.object({ input: z.string().min(1) });

type AssigneeRole = {
  id: string;
  name: string;
  nameEn: string | null;
};

function resolveAssignee(raw: string, input: string, roles: AssigneeRole[], currentRoleId: string) {
  const value = raw.trim();

  // 处理逗号分隔的多个ID
  if (value.includes(',')) {
    return value;
  }

  const lowerValue = value.toLowerCase();
  const lowerInput = input.toLowerCase();

  if (!value) {
    const mentioned = roles.find((role) =>
      input.includes(role.name) || (role.nameEn ? lowerInput.includes(role.nameEn.toLowerCase()) : false)
    );
    return mentioned?.id ?? currentRoleId;
  }

  if (["all", "everyone", "全部", "所有人"].includes(lowerValue) || ["全部", "所有人"].includes(value)) {
    return "all";
  }

  const exact = roles.find((role) =>
    role.id === value ||
    role.name === value ||
    role.nameEn?.toLowerCase() === lowerValue
  );
  if (exact) return exact.id;

  const partial = roles.find((role) =>
    value.includes(role.name) ||
    role.name.includes(value) ||
    (role.nameEn ? lowerValue.includes(role.nameEn.toLowerCase()) || role.nameEn.toLowerCase().includes(lowerValue) : false)
  );
  if (partial) return partial.id;

  const mentioned = roles.find((role) =>
    input.includes(role.name) || (role.nameEn ? lowerInput.includes(role.nameEn.toLowerCase()) : false)
  );
  return mentioned?.id ?? currentRoleId;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    if (auth.isAdmin) {
      return NextResponse.json({ error: "管理员不可使用前台任务解析" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsedBody = bodySchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ error: "参数不合法" }, { status: 400 });
    }

    const [config, roles, apiKey] = await Promise.all([
      getSystemConfig(),
      prisma.role.findMany({
        where: { isAdmin: false },
        select: { id: true, name: true, nameEn: true },
        orderBy: { createdAt: "asc" }
      }),
      getDecryptedLlmApiKey()
    ]);

    const llmConfig = (config.llmBaseUrl && config.llmModel && apiKey) ? {
      apiUrl: config.llmBaseUrl,
      apiKey,
      model: config.llmModel
    } : null;

    const startTime = Date.now();
    const results = await parseWithRouter(
      parsedBody.data.input,
      llmConfig,
      {
        nowIso: new Date().toISOString(),
        timezone: "Asia/Shanghai",
        assignees: roles
      }
    );
    const parseTime = Date.now() - startTime;

    const resolvedResults = results.map((result) => ({
      ...result,
      assignee: resolveAssignee(result.assignee, parsedBody.data.input, roles, auth.roleId)
    }));

    return NextResponse.json({
      results: resolvedResults,
      parseTime
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "解析失败，请手动填写";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
