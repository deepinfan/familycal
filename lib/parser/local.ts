import * as chrono from "chrono-node";
import type { LlmParsedResult, LlmParseContext, Role } from "./types";

function splitTasks(input: string): string[] {
  const separators = /[、，,;；\n]|然后|还有|接着|\s+and\s+/g;
  return input.split(separators).map(s => s.trim()).filter(Boolean);
}

function parseTime(text: string, refDate: Date): Date | null {
  const results = chrono.parse(text, refDate, { forwardDate: true });
  return results[0]?.start.date() || null;
}

const TYPE_KEYWORDS: Record<string, string[]> = {
  '学习': ['学习', '复习', '作业', 'study', 'homework', 'read', 'learn'],
  '玩耍': ['玩', '游戏', '看电影', 'play', 'game', 'movie', 'watch'],
  '家务': ['打扫', '洗衣', '做饭', 'clean', 'cook', 'wash', 'laundry'],
  '购物': ['买', '购物', 'shopping', 'buy', 'purchase']
};

function matchType(text: string): string {
  const lower = text.toLowerCase();
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) return type;
  }
  return '其他';
}

function matchAssignee(text: string, roles: Role[]): string {
  const lower = text.toLowerCase();
  for (const role of roles) {
    if (text.includes(role.name)) return role.id;
    if (role.nameEn && lower.includes(role.nameEn.toLowerCase())) return role.id;
  }
  return '';
}

const REPEAT_PATTERNS: Record<string, string[]> = {
  'daily': ['每天', 'daily', 'everyday'],
  'weekly': ['每周', 'weekly', 'every week'],
  'monthly': ['每月', 'monthly', 'every month'],
  'yearly': ['每年', 'yearly', 'every year']
};

function matchRepeatCycle(text: string): "none" | "daily" | "weekly" | "monthly" | "yearly" {
  const lower = text.toLowerCase();
  for (const [cycle, keywords] of Object.entries(REPEAT_PATTERNS)) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      return cycle as "daily" | "weekly" | "monthly" | "yearly";
    }
  }
  return 'none';
}

function extractTitle(text: string, type: string): string {
  let title = text;
  for (const keywords of Object.values(TYPE_KEYWORDS)) {
    for (const kw of keywords) {
      title = title.replace(new RegExp(kw, 'gi'), '');
    }
  }
  title = title.replace(/\d{1,2}[::：点]\d{0,2}/g, '');
  title = title.replace(/明天|后天|今天|下周|next\s+\w+|tomorrow|today/gi, '');
  return title.trim() || type;
}

export async function parseTasksLocally(
  input: string,
  context: LlmParseContext
): Promise<LlmParsedResult[]> {
  const tasks = splitTasks(input);
  const refDate = new Date(context.nowIso);

  return tasks.map(taskText => {
    const datetime = parseTime(taskText, refDate);
    if (!datetime) throw new Error("时间解析失败");

    const type = matchType(taskText);
    const assignee = matchAssignee(taskText, context.assignees);
    const repeat_cycle = matchRepeatCycle(taskText);
    const title_zh = extractTitle(taskText, type);

    return {
      title_zh,
      title_en: '',
      datetime: datetime.toISOString(),
      assignee,
      type,
      repeat_cycle,
      repeat_until: null
    };
  });
}
