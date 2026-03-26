# API 日期范围过滤实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化 API 数据加载性能，只返回过去 1 个月 + 未来 2 个月的任务

**Architecture:** 在 API 层添加日期范围过滤，减少数据传输量和前端内存占用

**Tech Stack:** Prisma, PostgreSQL, Next.js API Routes

---

## 问题分析

### 当前问题

**API 实现**（`app/api/events/route.ts:55-62`）：
```typescript
prisma.event.findMany({
  include: { ... },
  orderBy: { datetime: "asc" }
})
```

**问题点：**
1. ❌ 无日期范围过滤 - 返回所有历史任务
2. ❌ 无分页 - 一次性加载全部数据
3. ❌ 性能风险 - 随着时间累积，数据量会越来越大

**性能影响：**
- 数据库查询时间增加
- 网络传输时间增加
- 前端内存占用增加
- 页面渲染性能下降

### 解决方案：日期范围过滤

**过滤范围：过去 1 个月 + 未来 2 个月**

```
                今天
                 ↓
    ←─ 1个月 ─→ | ←──── 2个月 ────→
    [历史任务]   |   [未来任务]
```

**优势：**
- 减少数据传输量（预计减少 70-90%）
- 提升查询性能
- 降低前端内存占用
- 保留足够的历史和未来视野

---

## 实施任务

### Task 1: 修改 API 添加日期范围过滤

**Files:**
- Modify: `app/api/events/route.ts:40-82`

- [ ] **Step 1: 计算日期范围**

在 GET 函数开始处添加日期计算：

```typescript
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (auth.isAdmin) {
    return NextResponse.json({ error: "管理员仅可访问后台" }, { status: 403 });
  }

  // 计算日期范围：过去1个月 + 未来2个月
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - 1);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 2);
  endDate.setHours(23, 59, 59, 999);

  // 继续原有代码...
```

- [ ] **Step 2: 添加 WHERE 条件**

修改 `prisma.event.findMany()` 查询：

```typescript
prisma.event.findMany({
  where: {
    datetime: {
      gte: startDate,
      lte: endDate
    }
  },
  include: {
    creator: { select: { id: true, name: true, nameEn: true } },
    issuedBy: { select: { id: true, name: true, nameEn: true } },
    assignees: { include: { role: { select: { id: true, name: true, nameEn: true } } } }
  },
  orderBy: { datetime: "asc" }
})
```

- [ ] **Step 3: 提交代码**

```bash
git add app/api/events/route.ts
git commit -m "feat: add date range filtering to events API (past 1 month + future 2 months)"
```

---

### Task 2: 实现分页加载

**Files:**
- Modify: `app/api/events/route.ts:40-82`
- Modify: `app/(app)/events-context.tsx`
- Modify: `app/(app)/page.tsx`
- Modify: `app/(app)/calendar/page.tsx`

- [ ] **Step 1: API 添加分页参数**

修改 `app/api/events/route.ts` 的 GET 函数：

```typescript
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (auth.isAdmin) {
    return NextResponse.json({ error: "管理员仅可访问后台" }, { status: 403 });
  }

  // 获取分页参数
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const skip = (page - 1) * limit;

  // 计算日期范围
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - 1);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 2);
  endDate.setHours(23, 59, 59, 999);

  // 查询总数
  const total = await prisma.event.count({
    where: {
      datetime: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  // 分页查询
  const events = await prisma.event.findMany({
    where: {
      datetime: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      creator: { select: { id: true, name: true, nameEn: true } },
      issuedBy: { select: { id: true, name: true, nameEn: true } },
      assignees: { include: { role: { select: { id: true, name: true, nameEn: true } } } }
    },
    orderBy: { datetime: "asc" },
    skip,
    take: limit
  });

  return NextResponse.json({
    events,
    roles: await prisma.role.findMany(),
    currentRoleId: auth.roleId,
    pagination: {
      page,
      limit,
      total,
      hasMore: skip + events.length < total
    }
  });
}
```

- [ ] **Step 2: EventsContext 添加分页状态**

修改 `app/(app)/events-context.tsx`：

```typescript
type EventsContextType = {
  events: EventItem[];
  roles: Role[];
  currentRoleId: string;
  loading: boolean;
  error: string;
  hasMore: boolean;
  loadEvents: () => Promise<void>;
  loadMore: () => Promise<void>;
  createEvent: (event: EventItem) => void;
  updateEvent: (id: string, updates: Partial<EventItem>) => void;
  deleteEvent: (id: string) => void;
};

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentRoleId, setCurrentRoleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  async function loadEvents() {
    setLoading(true);
    setError("");
    setPage(1);
    try {
      const res = await fetch("/api/events?page=1&limit=50", { cache: "no-store" });
      if (!res.ok) throw new Error("加载失败");
      const json = await res.json();
      setEvents(json.events ?? []);
      setRoles(json.roles ?? []);
      setCurrentRoleId(json.currentRoleId ?? "");
      setHasMore(json.pagination?.hasMore ?? false);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError("加载任务失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!hasMore || loading) return;

    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/events?page=${nextPage}&limit=50`, { cache: "no-store" });
      if (!res.ok) throw new Error("加载失败");
      const json = await res.json();
      setEvents(prev => [...prev, ...(json.events ?? [])]);
      setPage(nextPage);
      setHasMore(json.pagination?.hasMore ?? false);
    } catch (err) {
      console.error('Failed to load more events:', err);
      setError("加载更多失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <EventsContext.Provider value={{
      events, roles, currentRoleId, loading, error, hasMore,
      loadEvents, loadMore, createEvent, updateEvent, deleteEvent
    }}>
      {children}
    </EventsContext.Provider>
  );
}
```

- [ ] **Step 3: 任务页面添加"加载更多"按钮**

在 `app/(app)/page.tsx` 底部添加：

```typescript
const { events, roles, currentRoleId, loading, error: loadError, hasMore, loadMore, createEvent: addEvent, updateEvent: modifyEvent, deleteEvent: removeEvent } = useEvents();

// 在页面底部添加
{hasMore && !loading ? (
  <div style={{ textAlign: 'center', padding: '2rem' }}>
    <button type="button" className="btn btn-ghost" onClick={loadMore}>
      {t("loadMore")}
    </button>
  </div>
) : null}
```

- [ ] **Step 4: 日历页面添加滚动加载**

在 `app/(app)/calendar/page.tsx` 添加滚动监听：

```typescript
const { events, roles, currentRoleId, hasMore, loadMore, createEvent: addEvent, updateEvent: modifyEvent, deleteEvent: removeEvent } = useEvents();

useEffect(() => {
  const handleScroll = () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      if (hasMore && !loading) {
        loadMore();
      }
    }
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [hasMore, loading, loadMore]);
```

- [ ] **Step 5: 提交代码**

```bash
git add app/api/events/route.ts app/(app)/events-context.tsx app/(app)/page.tsx app/(app)/calendar/page.tsx
git commit -m "feat: add pagination to events API and UI"
```

---

### Task 3: 实现虚拟滚动

**Files:**
- Create: `app/(app)/virtual-list.tsx`
- Modify: `app/(app)/page.tsx`
- Modify: `app/(app)/calendar/page.tsx`

- [ ] **Step 1: 创建虚拟列表组件**

创建 `app/(app)/virtual-list.tsx`：

```typescript
"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height: containerHeight,
        overflow: "auto",
        position: "relative"
      }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 任务页面使用虚拟列表**

修改 `app/(app)/page.tsx`：

```typescript
import { VirtualList } from "./virtual-list";

// 在渲染任务列表时使用虚拟列表
<VirtualList
  items={mineFilter === "unfinished" ? mineUnfinished : mineDone}
  itemHeight={120}
  containerHeight={600}
  renderItem={(item) => renderCard(item, false)}
/>
```

- [ ] **Step 3: 日历页面使用虚拟列表**

修改 `app/(app)/calendar/page.tsx` 的月视图：

```typescript
import { VirtualList } from "../virtual-list";

// 在月视图的任务列表中使用虚拟列表
<VirtualList
  items={monthEvents}
  itemHeight={80}
  containerHeight={500}
  renderItem={(item) => (
    <li className="month-task-item">
      {/* 任务渲染逻辑 */}
    </li>
  )}
/>
```

- [ ] **Step 4: 提交代码**

```bash
git add app/(app)/virtual-list.tsx app/(app)/page.tsx app/(app)/calendar/page.tsx
git commit -m "feat: add virtual scrolling for large task lists"
```

---

## 边界情况处理

### 1. 重复任务跨越日期范围
**问题：** 重复任务的 `repeatUntil` 可能超出3个月范围
**处理：** 只要任务的 `datetime` 在范围内就返回，`repeatUntil` 不影响过滤

### 2. 日历月份导航
**问题：** 用户在日历中查看未来第3、4个月时，数据不在范围内
**处理：** 当前实现已足够，因为：
- 日历主要显示当前月和相邻月
- 用户很少查看3个月以后的日历
- 如需查看更远的月份，可以考虑后续优化（按需加载）

### 3. 历史任务查看
**问题：** 用户无法查看1个月前的历史任务
**处理：**
- 当前方案：只保留1个月历史
- 如需查看更早历史，可以后续添加"查看历史"功能

### 4. 时区问题
**问题：** 服务器时区和用户时区可能不同
**处理：** 使用服务器时间计算范围，保持一致性

### 5. 分页边界情况
**问题：** 用户快速滚动时可能触发多次加载
**处理：** 在 loadMore 函数中检查 loading 状态，防止重复请求

### 6. 虚拟滚动性能
**问题：** 任务高度不一致时虚拟滚动计算不准确
**处理：** 使用固定高度或动态测量高度（当前使用固定高度简化实现）

### 7. 新建任务后的列表更新
**问题：** 新建任务后需要重新排序和定位
**处理：** createEvent 函数自动按时间排序，无需重新加载

---

## 测试计划

### 功能测试

- [ ] **测试 1: 验证日期范围过滤**
  - 创建过去2个月的任务
  - 创建过去1个月内的任务
  - 创建未来2个月内的任务
  - 创建未来3个月的任务
  - 验证只返回过去1个月和未来2个月的任务

- [ ] **测试 2: 任务页面正常显示**
  - 访问任务页面，验证任务正常显示
  - 验证未完成和已完成任务都正确显示

- [ ] **测试 3: 日历页面正常显示**
  - 访问日历页面，验证当前月任务显示
  - 切换到下个月，验证任务显示
  - 切换到上个月，验证任务显示

- [ ] **测试 4: 创建任务**
  - 创建新任务，验证立即显示
  - 创建重复任务，验证正确显示

- [ ] **测试 5: 分页功能**
  - 首次加载，验证只返回第一页数据（50条）
  - 点击"加载更多"按钮，验证加载第二页
  - 滚动到底部，验证自动加载更多
  - 验证 hasMore 状态正确显示
  - 验证加载完所有数据后不再显示"加载更多"

- [ ] **测试 6: 虚拟滚动**
  - 创建100+条任务
  - 验证只渲染可见区域的任务（检查 DOM 节点数量）
  - 快速滚动，验证渲染流畅无卡顿
  - 验证滚动位置正确
  - 验证任务点击和编辑功能正常

### 性能测试

- [ ] **测试 5: 测量 API 响应时间**
  - 使用浏览器开发者工具测量 `/api/events` 响应时间
  - 对比优化前后的响应时间
  - 预期：响应时间减少 50%+

- [ ] **测试 6: 测量数据传输量**
  - 查看 Network 面板中的数据大小
  - 对比优化前后的数据量
  - 预期：数据量减少 70-90%

- [ ] **测试 7: 分页性能**
  - 测量首次加载时间（只加载50条）
  - 测量"加载更多"响应时间
  - 验证分页不影响页面交互流畅度
  - 预期：首次加载 < 500ms，加载更多 < 300ms

- [ ] **测试 8: 虚拟滚动性能**
  - 创建500+条任务
  - 测量滚动帧率（应保持 60fps）
  - 测量内存占用（应显著低于全量渲染）
  - 验证快速滚动无卡顿
  - 预期：内存占用减少 80%+，滚动流畅

---

## 预期效果

### 性能提升
- **API 响应时间**：减少 50-70%（日期过滤）+ 额外 30-50%（分页）
- **数据传输量**：减少 70-90%（日期过滤）+ 额外 80%（分页首次加载）
- **前端内存占用**：减少 70-90%（日期过滤）+ 额外 80-90%（虚拟滚动）
- **页面加载速度**：提升明显，首次加载 < 500ms
- **滚动性能**：保持 60fps，即使有 500+ 条任务

### 用户体验
- **首次加载**：极快的数据加载（只加载 50 条）
- **页面切换**：保持瞬间切换（已通过 EventsContext 优化）
- **功能完整性**：保留足够的历史和未来视野
- **按需加载**：用户可以通过滚动或点击加载更多数据
- **流畅滚动**：大量任务时依然流畅，无卡顿

### 可扩展性
- **长期使用**：即使使用多年，性能也不会下降
- **数据增长**：不受历史数据累积影响
- **大数据量支持**：虚拟滚动支持数千条任务的流畅渲染
- **渐进式加载**：分页确保即使数据量巨大也能快速响应

### 代码质量
- **模块化实现**：虚拟列表组件可复用
- **向后兼容**：不影响现有功能
- **易于维护**：清晰的日期范围、分页和虚拟滚动逻辑
- **性能优化层次**：三层优化（过滤 + 分页 + 虚拟滚动）互补

