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
    if (!llmConfig) {
      throw new Error("请配置 LLM 或简化输入");
    }
    return openaiAdapter.parseTask(input, llmConfig, context);
  }

  try {
    return await parseTasksLocally(input, context);
  } catch (error) {
    if (!llmConfig) {
      throw new Error("本地解析失败，请配置 LLM 或简化输入");
    }
    return openaiAdapter.parseTask(input, llmConfig, context);
  }
}
