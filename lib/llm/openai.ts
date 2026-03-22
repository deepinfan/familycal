import { z } from "zod";
import type { LlmAdapter, LlmParsedResult } from "./adapter";
import { extractJsonArray, getLlmPrompt } from "./adapter";

function normalizeIsoLikeDatetime(raw: unknown, fieldName: string) {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(`${fieldName} 为空`);
  }

  const value = raw.trim();
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  const normalized = value
    .replace(/\//g, "-")
    .replace(/\.\d+$/, "")
    .replace(" ", "T");
  const fallback = new Date(normalized);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toISOString();
  }

  throw new Error(`${fieldName} 不是有效时间: ${value}`);
}

const outputSchema = z.object({
  title_zh: z.string().min(1),
  title_en: z.string().optional().default(""),
  datetime: z.any().transform((value) => normalizeIsoLikeDatetime(value, "datetime")),
  assignee: z.string().optional().default(""),
  type: z.string().min(1),
  repeat_cycle: z.enum(["none", "daily", "weekly", "monthly", "yearly"]).default("none"),
  repeat_until: z.any().optional().nullable().transform((value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    return normalizeIsoLikeDatetime(value, "repeat_until");
  })
});

const outputArraySchema = z.array(outputSchema);

function normalizeChatCompletionsUrl(raw: string) {
  const base = raw.trim().replace(/\/$/, "");
  if (!base) {
    throw new Error("LLM base URL is empty");
  }
  return base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
}

function getMessageContent(messageContent: unknown): string {
  if (typeof messageContent === "string") return messageContent;
  if (Array.isArray(messageContent)) {
    return messageContent
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text;
        }
        return "";
      })
      .join("\n");
  }
  return "";
}

export const openaiAdapter: LlmAdapter = {
  async parseTask(input, config, context): Promise<LlmParsedResult[]> {
    const requestUrl = normalizeChatCompletionsUrl(config.apiUrl);
    const resp = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: getLlmPrompt(input, context) }]
      })
    });

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => "");
      throw new Error(`模型请求失败: ${resp.status}${errorText ? ` ${errorText.slice(0, 400)}` : ""}`);
    }

    const data = await resp.json();
    const content = getMessageContent(data?.choices?.[0]?.message?.content);
    if (!content) {
      throw new Error("模型返回内容为空");
    }
    const parsed = JSON.parse(extractJsonArray(content));
    return outputArraySchema.parse(parsed);
  }
};
