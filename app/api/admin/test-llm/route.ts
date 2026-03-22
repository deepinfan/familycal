import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthFromRequest } from "@/lib/auth";
import { getDecryptedLlmApiKey } from "@/lib/config/system-config";
import { openaiAdapter } from "@/lib/llm/openai";

const testSchema = z.object({
  llmBaseUrl: z.string().url(),
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

    const { llmBaseUrl, llmApiKey } = parsed.data;

    // 如果没有提供新的 API Key，使用已保存的
    const apiKey = llmApiKey?.trim() || await getDecryptedLlmApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "请先配置 API Key" }, { status: 400 });
    }

    // 获取可用模型列表
    const modelsRes = await fetch(`${llmBaseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000)
    });

    if (!modelsRes.ok) {
      const errorText = await modelsRes.text().catch(() => "");
      return NextResponse.json({
        error: `服务器返回错误 (${modelsRes.status}): ${errorText || "无法连接到服务器或API Key无效"}`
      }, { status: 502 });
    }

    const modelsData = await modelsRes.json();
    const models = modelsData.data?.map((m: any) => m.id) || [];

    return NextResponse.json({ message: "配置测试成功", models });
  } catch (error) {
    let message = "测试失败";
    if (error instanceof Error) {
      message = error.message;
      if (message.includes("aborted")) {
        message = "请求超时，请检查API地址是否正确";
      } else if (message.includes("fetch")) {
        message = "网络连接失败，请检查API地址和网络连接";
      }
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
