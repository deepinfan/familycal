import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { getSystemConfig, setLlmApiKey, upsertSystemConfig } from "@/lib/config/system-config";

const patchSchema = z.object({
  appTitleZh: z.string().min(1).optional(),
  appTitleEn: z.string().min(1).optional(),
  llmBaseUrl: z.string().url().optional(),
  llmModel: z.string().min(1).optional(),
  llmApiKey: z.string().min(1).optional()
});

export async function GET(request: NextRequest) {
  const authz = await requireAdmin(request);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const config = await getSystemConfig();
  return NextResponse.json({
    appTitleZh: config.appTitleZh,
    appTitleEn: config.appTitleEn,
    llmBaseUrl: config.llmBaseUrl,
    llmModel: config.llmModel,
    hasLlmApiKey: Boolean(config.llmApiKeyEncrypted)
  });
}

export async function PATCH(request: NextRequest) {
  const authz = await requireAdmin(request);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }

  const tasks: Promise<unknown>[] = [];

  if (parsed.data.appTitleZh) {
    tasks.push(upsertSystemConfig("app_title_zh", parsed.data.appTitleZh));
  }

  if (parsed.data.appTitleEn) {
    tasks.push(upsertSystemConfig("app_title_en", parsed.data.appTitleEn));
  }

  if (parsed.data.llmBaseUrl) {
    tasks.push(upsertSystemConfig("llm_base_url", parsed.data.llmBaseUrl));
  }

  if (parsed.data.llmModel) {
    tasks.push(upsertSystemConfig("llm_model", parsed.data.llmModel));
  }

  if (parsed.data.llmApiKey) {
    tasks.push(setLlmApiKey(parsed.data.llmApiKey));
  }

  await Promise.all(tasks);

  const config = await getSystemConfig();
  return NextResponse.json({
    appTitleZh: config.appTitleZh,
    appTitleEn: config.appTitleEn,
    llmBaseUrl: config.llmBaseUrl,
    llmModel: config.llmModel,
    hasLlmApiKey: Boolean(config.llmApiKeyEncrypted)
  });
}
