# 本地任务解析器设计文档

## 概述

将现有的纯 LLM 任务解析功能改造为**本地优先 + LLM 降级**的混合方案，在 Vercel Hobby 免费版上实现低成本、高准确度（90%）的中英文任务解析。

## 背景

**现状：**
- 所有任务解析依赖外部 LLM API（OpenAI/DeepSeek/Claude）
- 用户需要自行配置 API 密钥
- 每次解析都产生 API 调用成本

**目标：**
- 本地解析处理 85-90% 常见场景
- 复杂场景降级到用户配置的 LLM
- 支持中英文混合输入
- 支持批量任务识别
- 保持现有接口兼容

## 架构设计

### 整体架构

```
用户输入
    ↓
智能路由判断
    ↓
├─ 简单场景（85-90%）→ 本地解析器（chrono + 规则引擎）
│                          ↓
│                      返回结果
│
└─ 复杂场景（10-15%）→ LLM API（用户配置）
                          ↓
                      返回结果
```

### 核心组件

**1. 智能路由器（Router）**
- 职责：分析输入复杂度，选择解析策略
- 位置：`lib/parser/router.ts`

**2. 本地解析器（Local Parser）**
- 职责：基于规则引擎解析常见任务
- 位置：`lib/parser/local.ts`
- 依赖：chrono-node

**3. LLM 降级层**
- 职责：处理复杂语义
- 位置：复用现有 `lib/llm/adapter.ts`

**4. 统一适配器**
- 职责：保持接口兼容
- 位置：修改 `app/api/llm/parse/route.ts`

## 详细设计

### 1. 智能路由器

**判断规则：**

**使用本地解析：**
- 包含明确时间词（明天、下周、8点、next Monday、tonight）
- 包含任务类型关键词（学习、购物、家务、study、shopping）
- 结构简单（单句或用分隔符分割的多任务）
- 字符长度 < 200

**降级到 LLM：**
- 包含条件逻辑（"如果...就..."、"if...then"）
- 包含模糊时间（"最近"、"有空的时候"、"sometime"）
- 包含复杂依赖（"先...再..."、"完成...之后"）
- 本地解析失败时

**实现：**
```typescript
function shouldUseLLM(input: string): boolean {
  // 条件逻辑
  if (/如果|假如|要是|if\s+/i.test(input)) return true;

  // 模糊时间
  if (/最近|有空|sometime|whenever/i.test(input)) return true;

  // 复杂依赖
  if (/先.*再|之后|after.*then/i.test(input)) return true;

  // 过长
  if (input.length > 200) return true;

  return false;
}
```

### 2. 本地解析器

**核心库：chrono-node**
- 支持中英文时间解析
- 识别相对时间（明天、next week）
- 识别绝对时间（2026-03-28、March 28）

**解析流程：**

**步骤 1：任务分割**
```typescript
function splitTasks(input: string): string[] {
  // 识别分隔符：顿号、逗号、分号、换行、"然后"、"还有"、"and"
  const separators = /[、，,;；\n]|然后|还有|接着|\s+and\s+/g;
  return input.split(separators).map(s => s.trim()).filter(Boolean);
}
```

**步骤 2：时间解析**
```typescript
import * as chrono from 'chrono-node';

function parseTime(text: string, refDate: Date): Date | null {
  const results = chrono.parse(text, refDate, { forwardDate: true });
  return results[0]?.start.date() || null;
}
```

**步骤 3：任务类型匹配**
```typescript
const TYPE_KEYWORDS = {
  '学习': ['学习', '复习', '作业', 'study', 'homework', 'read', 'learn'],
  '玩耍': ['玩', '游戏', '看电影', 'play', 'game', 'movie', 'watch'],
  '家务': ['打扫', '洗衣', '做饭', 'clean', 'cook', 'wash', 'laundry'],
  '购物': ['买', '购物', 'shopping', 'buy', 'purchase'],
  '其他': []
};

function matchType(text: string): string {
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) return type;
  }
  return '其他';
}
```

**步骤 4：负责人识别**
```typescript
function matchAssignee(text: string, roles: Role[]): string {
  for (const role of roles) {
    if (text.includes(role.name)) return role.id;
    if (role.nameEn && text.toLowerCase().includes(role.nameEn.toLowerCase())) {
      return role.id;
    }
  }
  return ''; // 空字符串由现有 resolveAssignee 处理
}
```

**步骤 5：重复模式识别**
```typescript
const REPEAT_PATTERNS = {
  'daily': ['每天', 'daily', 'everyday'],
  'weekly': ['每周', 'weekly', 'every week'],
  'monthly': ['每月', 'monthly', 'every month'],
  'yearly': ['每年', 'yearly', 'every year']
};

function matchRepeatCycle(text: string): RepeatCycle {
  for (const [cycle, keywords] of Object.entries(REPEAT_PATTERNS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return cycle as RepeatCycle;
    }
  }
  return 'none';
}
```

### 3. 数据流

**请求处理流程：**

```
POST /api/llm/parse { input: "明天8点学习，下午3点购物" }
    ↓
1. 智能路由判断 → 使用本地解析
    ↓
2. 任务分割 → ["明天8点学习", "下午3点购物"]
    ↓
3. 并行解析每个任务：
   - 时间：chrono.parse("明天8点") → 2026-03-28T08:00
   - 类型：matchType("学习") → "学习"
   - 负责人：matchAssignee(...) → ""
   - 重复：matchRepeatCycle(...) → "none"
    ↓
4. 返回结果：
{
  results: [
    {
      title_zh: "学习",
      title_en: "",
      datetime: "2026-03-28T08:00:00.000Z",
      assignee: "",
      type: "学习",
      repeat_cycle: "none",
      repeat_until: null
    },
    {
      title_zh: "购物",
      title_en: "",
      datetime: "2026-03-28T15:00:00.000Z",
      assignee: "",
      type: "购物",
      repeat_cycle: "none",
      repeat_until: null
    }
  ]
}
```

### 4. 错误处理

**本地解析失败：**
- 时间解析失败 → 自动降级到 LLM
- 类型识别失败 → 默认"其他"
- 负责人识别失败 → 返回空字符串

**LLM 降级失败：**
- API 未配置 → 返回错误"请配置 LLM 或简化输入"
- API 调用失败 → 返回原有错误信息

**降级日志：**
- 记录触发 LLM 降级的输入
- 用于后续优化规则引擎

### 5. 性能优化

**执行时间目标：**
- 本地解析：<200ms
- LLM 降级：<3s（取决于用户 API）

**优化措施：**
- chrono 解析结果缓存（相同日期引用）
- 规则匹配使用 Trie 树加速关键词查找
- 批量任务并行处理

## 接口兼容性

**保持现有接口不变：**
- 请求：`POST /api/llm/parse { input: string }`
- 响应：`{ results: LlmParsedResult[] }`
- 前端代码无需修改

## 测试策略

### 测试用例（目标 90% 成功率）

**时间解析：**
- ✓ "明天8点学习"
- ✓ "下周三下午3点购物"
- ✓ "next Monday 9am homework"
- ✓ "今晚8点看电影"
- ✓ "2026-03-30 10:00 打扫"

**批量任务：**
- ✓ "明天8点学习，下午3点购物" → 2个任务
- ✓ "周一学习\n周二购物\n周三打扫" → 3个任务
- ✓ "买菜、做饭、洗碗" → 3个任务

**中英文混合：**
- ✓ "tomorrow 8点 study English"
- ✓ "next week 购物 shopping"

**复杂场景（降级到 LLM）：**
- → "如果明天天气好就去公园"
- → "最近找时间学习英语"
- → "先完成作业再玩游戏"

### 成功率监控

**指标：**
- 本地解析成功率（目标 90%）
- LLM 降级率（目标 <10%）
- 平均响应时间（本地 <200ms）

## 实现计划

### 阶段 1：基础设施（1-2天）

1. 安装依赖：`npm install chrono-node`
2. 创建文件结构：
   - `lib/parser/local.ts` - 本地解析器
   - `lib/parser/router.ts` - 智能路由器
   - `lib/parser/types.ts` - 类型定义

### 阶段 2：规则引擎（2-3天）

1. 实现任务分割逻辑
2. 集成 chrono-node 时间解析
3. 实现类型匹配规则
4. 实现负责人识别
5. 实现重复模式识别
6. 编写单元测试

### 阶段 3：集成与测试（1-2天）

1. 修改 `/api/llm/parse/route.ts` 集成路由器
2. 编写集成测试
3. 验证 90% 成功率目标
4. 性能测试与优化

## 风险与缓解

**风险 1：本地解析准确率不达标**
- 缓解：持续收集失败案例，优化规则引擎
- 降级：复杂场景自动使用 LLM

**风险 2：chrono-node 中文支持不足**
- 缓解：补充自定义中文时间解析规则
- 备选：使用 Sugar.js 或自研轻量解析器

**风险 3：Vercel 函数执行时间超限**
- 缓解：本地解析优化到 <200ms
- 监控：添加性能日志

## 总结

本方案通过**本地优先 + LLM 降级**策略，在 Vercel Hobby 免费版上实现：
- 90% 任务本地解析（零成本）
- 10% 复杂任务 LLM 处理（用户自行配置）
- 支持中英文混合输入
- 支持批量任务识别
- 保持现有接口兼容

预期效果：大幅降低 API 调用成本，同时保持良好的用户体验。
