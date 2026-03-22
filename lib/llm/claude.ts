import { z } from "zod";
import type { LlmAdapter, LlmParsedResult } from "./adapter";
import { extractJsonObject, getLlmPrompt } from "./adapter";

const outputSchema = z.object({
  title_zh: z.string().min(1),
  title_en: z.string().min(1),
  datetime: z.string().datetime(),
  assignee: z.string().min(1),
  type: z.string().min(1),
  repeat_cycle: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).default("none"),
  repeat_until: z.string().datetime().nullable().optional().default(null)
});

export const claudeAdapter: LlmAdapter = {
  async parseTask(input, config, context): Promise<LlmParsedResult> {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: config.model || "claude-3-5-sonnet-latest",
        max_tokens: 500,
        messages: [{ role: "user", content: getLlmPrompt(input, context) }]
      })
    });

    if (!resp.ok) {
      throw new Error(`Claude request failed: ${resp.status}`);
    }

    const data = await resp.json();
    const text = data?.content?.find((item: { type?: string }) => item.type === "text")?.text ?? "";
    const parsed = JSON.parse(extractJsonObject(text));
    return outputSchema.parse(parsed);
  }
};
