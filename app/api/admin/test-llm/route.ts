import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/lib/auth";
import { getDecryptedLlmApiKey } from "@/lib/config/system-config";
import { openaiAdapter } from "@/lib/llm/openai";

const testSchema = z.object({
  llmBaseUrl: z.string().url(),
  llmModel: z.string().min(1),
  llmApiKey: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth?.isAdmin) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = testSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const { llmBaseUrl, llmModel, llmApiKey } = parsed.data;

    // 如果没有提供新的 API Key，使用已保存的
    const apiKey = llmApiKey?.trim() || await getDecryptedLlmApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "请先配置 API Key" }, { status: 400 });
    }

    await openaiAdapter.parseTask(
      "明天下午3点买菜",
      { apiUrl: llmBaseUrl, apiKey, model: llmModel },
      {
        nowIso: new Date().toISOString(),
        timezone: "Asia/Shanghai",
        assignees: []
      }
    );

    return NextResponse.json({ message: "LLM 配置测试成功" });
  } catch (error) {
    let message = "测试失败";
    if (error instanceof Error) {
      message = error.message;
      // 如果是 Zod 验证错误，提取更友好的信息
      if (message.includes("type") && message.includes("too_small")) {
        message = "LLM 返回的任务类型字段为空，请检查模型配置或提示词";
      }
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
