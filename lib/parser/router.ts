import type { LlmParsedResult, LlmParseContext } from "./types";
import type { LlmClientConfig } from "../llm/adapter";
import { parseTasksLocally } from "./local";
import { openaiAdapter } from "../llm/openai";

export function shouldUseLLM(input: string): boolean {
  if (/如果|假如|要是|if\s+/i.test(input)) return true;
  if (/最近|有空|sometime|whenever/i.test(input)) return true;
  if (/先.*再|之后|after.*then/i.test(input)) return true;
  if (input.length > 200) return true;
  return false;
}

export async function parseWithRouter(
  input: string,
  llmConfig: LlmClientConfig | null,
  context: LlmParseContext
): Promise<LlmParsedResult[]> {
  if (shouldUseLLM(input)) {
    console.log("[Parser] 使用 LLM 解析（复杂场景）");
    if (!llmConfig) {
      throw new Error("请配置 LLM 或简化输入");
    }
    return openaiAdapter.parseTask(input, llmConfig, context);
  }

  try {
    console.log("[Parser] 使用本地解析");
    const startTime = Date.now();
    const result = await parseTasksLocally(input, context);
    console.log(`[Parser] 本地解析完成，耗时 ${Date.now() - startTime}ms`);
    return result;
  } catch (error) {
    console.log("[Parser] 本地解析失败，降级到 LLM:", error instanceof Error ? error.message : error);
    if (!llmConfig) {
      throw new Error("本地解析失败，请配置 LLM 或简化输入");
    }
    return openaiAdapter.parseTask(input, llmConfig, context);
  }
}
