# 本地任务解析器实现计划

## 目标

实现本地优先 + LLM 降级的混合任务解析方案，目标本地解析成功率 90%。

## 前置条件

- 已有 LLM 解析功能（`lib/llm/adapter.ts`、`app/api/llm/parse/route.ts`）
- 项目使用 TypeScript + Next.js
- 部署在 Vercel Hobby 免费版

## 实现阶段

### 阶段 1：基础设施搭建

**目标：** 安装依赖，创建文件结构

**任务：**

1. 安装 chrono-node 依赖
   - 文件：`package.json`
   - 命令：`npm install chrono-node`
   - 验证：检查 package.json 中是否添加

2. 创建类型定义文件
   - 文件：`lib/parser/types.ts`
   - 内容：定义 ParseContext、ParseResult 等类型
   - 复用现有 `LlmParsedResult` 类型

3. 创建本地解析器骨架
   - 文件：`lib/parser/local.ts`
   - 内容：导出 `parseTasksLocally` 函数骨架
   - 返回类型：`Promise<LlmParsedResult[]>`

4. 创建智能路由器骨架
   - 文件：`lib/parser/router.ts`
   - 内容：导出 `shouldUseLLM` 和 `parseWithRouter` 函数
   - 实现基础路由逻辑

**验证标准：**
- 文件结构创建完成
- TypeScript 编译无错误
- 骨架函数可调用（返回空数组或抛出 NotImplemented）

---

### 阶段 2：本地解析器实现

**目标：** 实现规则引擎核心功能

**任务：**

1. 实现任务分割逻辑
   - 文件：`lib/parser/local.ts`
   - 函数：`splitTasks(input: string): string[]`
   - 逻辑：使用正则识别分隔符（顿号、逗号、换行、"然后"、"and"）
   - 测试用例：
     - "明天8点学习，下午3点购物" → ["明天8点学习", "下午3点购物"]
     - "买菜\n做饭\n洗碗" → ["买菜", "做饭", "洗碗"]

2. 实现时间解析
   - 文件：`lib/parser/local.ts`
   - 函数：`parseTime(text: string, refDate: Date): Date | null`
   - 依赖：chrono-node
   - 逻辑：调用 `chrono.parse()`，返回第一个结果
   - 测试用例：
     - "明天8点" → 2026-03-28T08:00
     - "next Monday 9am" → 下周一 09:00
     - "今晚" → 今天 20:00（默认）

3. 实现任务类型匹配
   - 文件：`lib/parser/local.ts`
   - 函数：`matchType(text: string): string`
   - 逻辑：关键词匹配，返回"学习"/"玩耍"/"家务"/"购物"/"其他"
   - 关键词表：
     - 学习：学习、复习、作业、study、homework、read、learn
     - 玩耍：玩、游戏、看电影、play、game、movie、watch
     - 家务：打扫、洗衣、做饭、clean、cook、wash、laundry
     - 购物：买、购物、shopping、buy、purchase

4. 实现负责人识别
   - 文件：`lib/parser/local.ts`
   - 函数：`matchAssignee(text: string, roles: Role[]): string`
   - 逻辑：匹配角色名称（中英文），返回 roleId 或空字符串

5. 实现重复模式识别
   - 文件：`lib/parser/local.ts`
   - 函数：`matchRepeatCycle(text: string): RepeatCycle`
   - 逻辑：关键词匹配，返回 "none"/"daily"/"weekly"/"monthly"/"yearly"

6. 组装完整解析器
   - 文件：`lib/parser/local.ts`
   - 函数：`parseTasksLocally(input: string, context: ParseContext): Promise<LlmParsedResult[]>`
   - 逻辑：分割任务 → 并行解析 → 返回结果数组

**验证标准：**
- 所有单元测试通过
- 能正确解析设计文档中的测试用例
- 时间解析准确率 >95%

---

### 阶段 3：智能路由器实现

**目标：** 实现路由判断逻辑

**任务：**

1. 实现复杂度判断
   - 文件：`lib/parser/router.ts`
   - 函数：`shouldUseLLM(input: string): boolean`
   - 逻辑：检查条件逻辑、模糊时间、复杂依赖、长度

2. 实现路由解析器
   - 文件：`lib/parser/router.ts`
   - 函数：`parseWithRouter(input, llmConfig, context): Promise<LlmParsedResult[]>`
   - 逻辑：判断 → 本地解析或 LLM → 失败降级

**验证标准：**
- 简单输入走本地解析
- 复杂输入走 LLM
- 本地解析失败自动降级


---

### 阶段 4：API 集成

**目标：** 修改现有 API 路由使用新解析器

**任务：**

1. 修改 API 路由
   - 文件：`app/api/llm/parse/route.ts`
   - 修改：将 `openaiAdapter.parseTask` 替换为 `parseWithRouter`
   - 保持：请求验证、resolveAssignee、错误处理逻辑
   - 添加：降级日志（记录 LLM 调用）

2. 类型兼容性检查
   - 确保返回类型与 `LlmParsedResult[]` 一致
   - 确保前端无需修改

**验证标准：**
- API 请求响应格式不变
- 前端功能正常
- 本地解析响应时间 <200ms

---

### 阶段 5：测试与优化

**目标：** 验证 90% 成功率目标，优化性能

**任务：**

1. 编写测试用例
   - 文件：`lib/parser/__tests__/local.test.ts`
   - 覆盖：时间解析、批量任务、类型匹配、负责人识别、重复模式
   - 目标：至少 20 个测试用例

2. 手动测试
   - 在开发环境测试真实场景
   - 记录失败案例
   - 统计本地解析成功率

3. 性能优化
   - 如果响应时间 >200ms，优化关键词匹配
   - 考虑缓存 chrono 解析结果

4. 规则优化
   - 根据失败案例补充关键词
   - 调整路由判断规则
   - 目标：本地解析成功率达到 90%

**验证标准：**
- 测试用例通过率 >95%
- 手动测试本地解析成功率 ≥90%
- 本地解析响应时间 <200ms
- LLM 降级率 <10%


---

## 关键文件清单

**新增文件：**
- `lib/parser/types.ts` - 类型定义
- `lib/parser/local.ts` - 本地解析器
- `lib/parser/router.ts` - 智能路由器
- `lib/parser/__tests__/local.test.ts` - 单元测试

**修改文件：**
- `package.json` - 添加 chrono-node 依赖
- `app/api/llm/parse/route.ts` - 集成路由器

**不修改文件：**
- `lib/llm/adapter.ts` - 保持 LLM 适配器不变
- `app/(app)/page.tsx` - 前端无需修改

---

## 风险与缓解

**风险 1：chrono-node 中文支持不足**
- 现象：中文时间解析失败率高
- 缓解：补充自定义中文时间解析规则
- 降级：失败时自动使用 LLM

**风险 2：本地解析准确率不达标**
- 现象：成功率 <90%
- 缓解：收集失败案例，持续优化规则
- 降级：复杂场景自动使用 LLM

**风险 3：性能不达标**
- 现象：响应时间 >200ms
- 缓解：优化关键词匹配算法
- 监控：添加性能日志

---

## 成功标准

- ✓ 本地解析成功率 ≥90%
- ✓ LLM 降级率 <10%
- ✓ 本地解析响应时间 <200ms
- ✓ 前端功能无影响
- ✓ 接口兼容性保持
- ✓ 支持中英文混合输入
- ✓ 支持批量任务识别

---

## 实施顺序

1. 阶段 1：基础设施（必须先完成）
2. 阶段 2：本地解析器（核心功能）
3. 阶段 3：智能路由器（依赖阶段 2）
4. 阶段 4：API 集成（依赖阶段 2、3）
5. 阶段 5：测试与优化（最后进行）

每个阶段完成后进行验证，确保通过后再进入下一阶段。
