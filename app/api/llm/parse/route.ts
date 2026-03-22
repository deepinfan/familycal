import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/lib/auth";
import { getDecryptedLlmApiKey, getSystemConfig } from "@/lib/config/system-config";
import { prisma } from "@/lib/prisma";
import { openaiAdapter } from "@/lib/llm/openai";

const bodySchema = z.object({ input: z.string().min(1) });

type AssigneeRole = {
  id: string;
  name: string;
  nameEn: string | null;
};

function resolveAssignee(raw: string, input: string, roles: AssigneeRole[], currentRoleId: string) {
  const value = raw.trim();
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

    if (!config.llmBaseUrl || !config.llmModel || !apiKey) {
      return NextResponse.json({ error: "模型服务未配置完整" }, { status: 400 });
    }

    const results = await openaiAdapter.parseTask(
      parsedBody.data.input,
      {
        apiUrl: config.llmBaseUrl,
        apiKey,
        model: config.llmModel
      },
      {
      nowIso: new Date().toISOString(),
      timezone: "Asia/Shanghai",
      assignees: roles
      }
    );

    const resolvedResults = results.map((result) => ({
      ...result,
      assignee: resolveAssignee(result.assignee, parsedBody.data.input, roles, auth.roleId)
    }));

    return NextResponse.json({ results: resolvedResults });
  } catch (error) {
    const message = error instanceof Error ? error.message : "解析失败，请手动填写";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
