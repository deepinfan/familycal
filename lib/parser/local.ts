import * as chrono from "chrono-node";
import type { LlmParsedResult, LlmParseContext, Role } from "./types";

function splitTasks(input: string): string[] {
  const separators = /[、，,;；\n]|然后|还有|接着|\s+and\s+/g;
  return input.split(separators).map(s => s.trim()).filter(Boolean);
}

function parseTime(text: string, refDate: Date): Date | null {
  const results = chrono.parse(text, refDate, { forwardDate: true });
  if (results.length > 0 && results[0].start) {
    return results[0].start.date();
  }

  // 中文相对日期解析
  const date = new Date(refDate);

  // 明天/后天
  if (/明天/.test(text)) {
    date.setDate(date.getDate() + 1);
  } else if (/后天/.test(text)) {
    date.setDate(date.getDate() + 2);
  }

  // 周几
  const weekdayMatch = text.match(/周([一二三四五六日天])/);
  if (weekdayMatch) {
    const weekdays = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
    const targetDay = weekdays[weekdayMatch[1] as keyof typeof weekdays];
    const currentDay = date.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) daysToAdd += 7;
    date.setDate(date.getDate() + daysToAdd);
  }

  // 时间点提取
  const timeMatch = text.match(/(\d{1,2})[::：点](\d{0,2})/);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    date.setHours(hour, minute, 0, 0);
  } else if (/下午/.test(text)) {
    date.setHours(15, 0, 0, 0);
  } else if (/上午/.test(text)) {
    date.setHours(9, 0, 0, 0);
  } else if (/晚上|晚/.test(text)) {
    date.setHours(19, 0, 0, 0);
  } else if (/早上|早/.test(text)) {
    date.setHours(8, 0, 0, 0);
  } else if (/中午/.test(text)) {
    date.setHours(12, 0, 0, 0);
  }

  // 如果解析出了有效日期变化，返回
  if (date.getTime() !== refDate.getTime()) {
    return date;
  }

  return null;
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
  const matched: string[] = [];

  for (const role of roles) {
    if (text.includes(role.name)) matched.push(role.id);
    else if (role.nameEn && lower.includes(role.nameEn.toLowerCase())) matched.push(role.id);
  }

  // 如果匹配到多个，返回逗号分隔的 ID
  if (matched.length > 1) {
    return matched.join(',');
  }

  return matched[0] || '';
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

  // 移除类型关键词
  for (const keywords of Object.values(TYPE_KEYWORDS)) {
    for (const kw of keywords) {
      title = title.replace(new RegExp(kw, 'gi'), '');
    }
  }

  // 移除时间相关词汇
  title = title.replace(/\d{1,2}[::：点]\d{0,2}/g, '');
  title = title.replace(/明天|后天|今天|周[一二三四五六日天]|上午|下午|晚上|早上|中午/g, '');
  title = title.replace(/next\s+\w+|tomorrow|today|morning|afternoon|evening|night/gi, '');

  // 移除重复模式关键词
  title = title.replace(/每天|每周|每月|每年/g, '');
  title = title.replace(/daily|weekly|monthly|yearly|everyday|every\s+\w+/gi, '');

  // 清理多余空格
  title = title.replace(/\s+/g, ' ').trim();

  // 如果标题为空，使用类型作为标题
  return title || type;
}

export async function parseTasksLocally(
  input: string,
  context: LlmParseContext
): Promise<LlmParsedResult[]> {
  const tasks = splitTasks(input);
  const refDate = new Date(context.nowIso);

  return tasks.map(taskText => {
    let datetime = parseTime(taskText, refDate);

    // 如果没有明确时间，使用当前时间 + 1小时作为默认
    if (!datetime) {
      datetime = new Date(refDate);
      datetime.setHours(datetime.getHours() + 1);
    }

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
