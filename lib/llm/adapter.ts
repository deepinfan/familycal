export type LlmParsedResult = {
  title_zh: string;
  title_en: string;
  datetime: string;
  assignee: string;
  type: string;
  repeat_cycle: "none" | "daily" | "weekly" | "monthly" | "yearly";
  repeat_until: string | null;
};

export type LlmParseContext = {
  nowIso: string;
  timezone: string;
  assignees: Array<{ id: string; name: string; nameEn?: string }>;
};

export type LlmClientConfig = {
  apiUrl: string;
  apiKey: string;
  model: string;
};

export interface LlmAdapter {
  parseTask(input: string, config: LlmClientConfig, context: LlmParseContext): Promise<LlmParsedResult[]>;
}

export function getLlmPrompt(input: string, context: LlmParseContext): string {
  const assignees = context.assignees.map((r) => `${r.name}${r.nameEn ? `/${r.nameEn}` : ""}(${r.id})`).join("、");
  return [
    "你是家庭任务解析器。",
    `当前时间: ${context.nowIso}`,
    `时区: ${context.timezone}`,
    `可选负责人: ${assignees}`,
    "将用户输入解析为 JSON 数组，每个任务一个对象。如果只有一个任务，也返回数组格式。仅输出 JSON，无额外文字。",
    "JSON 字段: title_zh,title_en,datetime,assignee,type,repeat_cycle,repeat_until",
    "datetime 必须是 ISO8601。assignee 必须返回负责人 id；如果无法判断则返回空字符串。",
    "type 必须从以下选项中选择一个: 学习,玩耍,家务,购物,其他",
    "repeat_cycle 仅可返回 none,daily,weekly,monthly,yearly 之一。",
    "如果用户没有提出重复需求，repeat_cycle 返回 none，repeat_until 返回 null。",
    "如果用户提出重复需求但没有明确截止日期，repeat_until 返回 null，让前端补充确认。",
    "如果用户给出了重复截止日期，repeat_until 必须返回 ISO8601。",
    `用户输入: ${input}`
  ].join("\n");
}

export function extractJsonArray(text: string): string {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("LLM did not return JSON array");
  }
  return text.slice(start, end + 1);
}
