import { z } from "zod";
import type { LlmAdapter, LlmParsedResult } from "./adapter";
import { extractJsonArray, getLlmPrompt } from "./adapter";

const outputSchema = z.object({
  title_zh: z.string().min(1),
  title_en: z.string().min(1),
  datetime: z.string().datetime(),
  assignee: z.string().min(1),
  type: z.string().min(1),
  repeat_cycle: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).default("none"),
  repeat_until: z.string().datetime().nullable().optional().default(null)
});

export const deepseekAdapter: LlmAdapter = {
  async parseTask(input, config, context): Promise<LlmParsedResult> {
    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model || "deepseek-chat",
        messages: [{ role: "user", content: getLlmPrompt(input, context) }]
      })
    });

    if (!resp.ok) {
      throw new Error(`DeepSeek request failed: ${resp.status}`);
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(extractJsonArray(content));
    return outputSchema.parse(parsed);
  }
};
