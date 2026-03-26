# 页面切换性能优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除任务页面和日历页面之间切换时的数据加载延迟

**Architecture:** 创建共享的 EventsContext 提供数据缓存和统一的数据管理，避免页面切换时重复请求 API

**Tech Stack:** React Context API, Next.js App Router, TypeScript

---

## 问题分析

### 当前问题
用户在任务页面 (`/`) 和日历页面 (`/calendar`) 之间切换时，每次都需要等待 1-2 秒才能看到任务列表。

### 根本原因

**当前实现：**
```
用户访问 /
  ↓
page.tsx 组件挂载
  ↓
useEffect 触发
  ↓
loadEvents() 调用
  ↓
GET /api/events (500-800ms)
  ↓
显示任务列表

用户切换到 /calendar
  ↓
calendar/page.tsx 组件挂载
  ↓
useEffect 触发
  ↓
loadEvents() 调用
  ↓
GET /api/events (500-800ms) ← 重复请求！
  ↓
显示日历任务
```

**问题点：**
1. **重复的 API 请求**：每个页面独立请求相同的数据
2. **无数据缓存**：页面卸载时数据丢失
3. **无加载状态**：用户看到空白页面
4. **无数据共享**：两个页面无法共享已加载的数据

## 解决方案设计

### 核心思路：共享数据上下文

创建 `EventsContext` 在两个页面之间共享数据：

```
Layout (app/(app)/layout.tsx)
  ↓
EventsProvider (新建)
  ├─ 缓存 events 数据
  ├─ 缓存 roles 数据
  ├─ 缓存 currentRoleId
  ├─ 提供 loadEvents() 方法
  ├─ 提供 updateEvent() 方法
  ├─ 提供 deleteEvent() 方法
  └─ 提供 createEvent() 方法
  ↓
├─ page.tsx (任务页面)
│   └─ 使用 useEvents() hook
└─ calendar/page.tsx (日历页面)
    └─ 使用 useEvents() hook
```

**优化后的流程：**
```
用户访问 /
  ↓
EventsProvider 初始化
  ↓
GET /api/events (500-800ms)
  ↓
数据缓存在 Context
  ↓
page.tsx 从 Context 读取 ← 瞬间显示

用户切换到 /calendar
  ↓
calendar/page.tsx 从 Context 读取 ← 瞬间显示（0ms）
  ↓
无需重新请求 API
```

**性能提升：**
- **首次加载**：500-800ms（与当前相同）
- **页面切换**：0ms（从缓存读取）
- **总体提升**：从 1-2 秒降至 0ms

## 文件结构

### 需要创建的文件

**1. app/(app)/events-context.tsx**
- 创建 EventsContext 和 EventsProvider
- 管理 events、roles、currentRoleId 状态
- 提供数据操作方法（load、create、update、delete）
- 实现数据缓存逻辑

### 需要修改的文件

**2. app/(app)/layout.tsx**
- 用 EventsProvider 包裹子组件
- 确保数据在整个 (app) 路由组中共享

**3. app/(app)/page.tsx**
- 移除本地 loadEvents 函数
- 使用 useEvents() hook 获取数据
- 保留本地 UI 状态管理（filters、editing 等）
- 使用 context 的 createEvent、updateEvent、deleteEvent 方法

**4. app/(app)/calendar/page.tsx**
- 移除本地 loadEvents 函数
- 使用 useEvents() hook 获取数据
- 保留本地 UI 状态管理（view、anchor、activeDate 等）
- 使用 context 的 createEvent、updateEvent、deleteEvent 方法

---

## 实施任务

### Task 1: 创建 EventsContext

**Files:**
- Create: `app/(app)/events-context.tsx`

- [ ] **Step 1: 定义类型**

```typescript
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Role = {
  id: string;
  name: string;
  nameEn: string;
};

type EventItem = {
  id: string;
  titleZh: string;
  titleEn: string;
  datetime: string;
  type: string;
  repeatCycle: "none" | "daily" | "weekly" | "monthly" | "yearly";
  repeatUntil: string | null;
  status: "pending" | "done" | "cancelled";
  creator: Role;
  issuedBy: Role;
  assignees: Role[];
  isSaving?: boolean;
};

type EventsContextType = {
  events: EventItem[];
  roles: Role[];
  currentRoleId: string;
  loading: boolean;
  error: string;
  loadEvents: () => Promise<void>;
  createEvent: (event: EventItem) => void;
  updateEvent: (id: string, updates: Partial<EventItem>) => void;
  deleteEvent: (id: string) => void;
};
```

- [ ] **Step 2: 创建 Context**

```typescript
const EventsContext = createContext<EventsContextType | undefined>(undefined);
```

- [ ] **Step 3: 实现 EventsProvider**

```typescript
export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentRoleId, setCurrentRoleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEvents() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      if (!res.ok) throw new Error("加载失败");
      const json = await res.json();
      setEvents(json.events ?? []);
      setRoles(json.roles ?? []);
      setCurrentRoleId(json.currentRoleId ?? "");
    } catch {
      setError("加载任务失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const createEvent = (event: EventItem) => {
    setEvents(prev => [...prev, event].sort((a, b) =>
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    ));
  };

  const updateEvent = (id: string, updates: Partial<EventItem>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <EventsContext.Provider value={{
      events, roles, currentRoleId, loading, error,
      loadEvents, createEvent, updateEvent, deleteEvent
    }}>
      {children}
    </EventsContext.Provider>
  );
}
```

- [ ] **Step 4: 导出 useEvents hook**

```typescript
export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error("useEvents must be used within EventsProvider");
  }
  return context;
}
```

- [ ] **Step 5: 提交**

```bash
git add app/(app)/events-context.tsx
git commit -m "feat: add EventsContext for shared data management"
```

---

### Task 2: 修改 Layout 添加 Provider

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: 导入 EventsProvider**

```typescript
import { EventsProvider } from "./events-context";
```

- [ ] **Step 2: 包裹 children**

```typescript
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <EventsProvider>
        <div className="app-layout">
          <AppNav />
          {children}
        </div>
      </EventsProvider>
    </LanguageProvider>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add app/(app)/layout.tsx
git commit -m "feat: wrap app layout with EventsProvider"
```

---

### Task 3: 修改任务页面使用 Context

**Files:**
- Modify: `app/(app)/page.tsx:107-175`

- [ ] **Step 1: 导入 useEvents hook**

```typescript
import { useEvents } from "./events-context";
```

- [ ] **Step 2: 替换本地状态为 context**

```typescript
// 删除这些行:
// const [data, setData] = useState<EventsResponse | null>(null);
// const [loading, setLoading] = useState(true);
// const [error, setError] = useState("");

// 替换为:
const { events, roles, currentRoleId, loading, error: loadError, createEvent: addEvent, updateEvent: modifyEvent, deleteEvent: removeEvent } = useEvents();
const [error, setError] = useState("");
```

- [ ] **Step 3: 删除 loadEvents 函数**

删除 lines 157-175 的 `loadEvents` 函数和 `useEffect`

- [ ] **Step 4: 更新 createEvent 使用 context**

```typescript
// 在成功创建后，使用 addEvent 而不是 setData
const json = await res.json();
addEvent(json.event);
```

- [ ] **Step 5: 提交**

```bash
git add app/(app)/page.tsx
git commit -m "refactor: use EventsContext in tasks page"
```

---

### Task 4: 修改日历页面使用 Context

**Files:**
- Modify: `app/(app)/calendar/page.tsx:111-163`

- [ ] **Step 1: 导入 useEvents hook**

```typescript
import { useEvents } from "../events-context";
```

- [ ] **Step 2: 替换本地状态为 context**

```typescript
// 删除这些行:
// const [events, setEvents] = useState<EventItem[]>([]);
// const [currentRoleId, setCurrentRoleId] = useState("");
// const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);

// 替换为:
const { events, roles, currentRoleId, createEvent: addEvent, updateEvent: modifyEvent, deleteEvent: removeEvent } = useEvents();
```

- [ ] **Step 3: 删除 loadEvents 函数**

删除 lines 151-163 的 `loadEvents` 函数和 `useEffect`

- [ ] **Step 4: 更新 createEventForDay 使用 context**

```typescript
// 在成功创建后，使用 addEvent 而不是 setEvents
const json = await res.json();
addEvent(json.event);
```

- [ ] **Step 5: 删除其他 loadEvents 调用**

删除 line 337 和 line 350 的 `await loadEvents()` 调用

- [ ] **Step 6: 提交**

```bash
git add app/(app)/calendar/page.tsx
git commit -m "refactor: use EventsContext in calendar page"
```

---

## 测试计划

### 功能测试

- [ ] **测试 1: 首次加载**
  - 访问 `/`，验证任务列表正常显示
  - 验证加载状态显示正确

- [ ] **测试 2: 页面切换（核心测试）**
  - 访问 `/`，等待数据加载完成
  - 切换到 `/calendar`，验证日历立即显示（无延迟）
  - 切换回 `/`，验证任务列表立即显示（无延迟）
  - 打开浏览器开发者工具 Network 面板，验证只有首次加载时请求 `/api/events`

- [ ] **测试 3: 创建任务**
  - 在 `/` 页面创建任务，验证任务立即显示
  - 切换到 `/calendar`，验证新任务在日历中显示
  - 切换回 `/`，验证新任务仍然存在

- [ ] **测试 4: 编辑任务**
  - 在 `/` 页面编辑任务，验证更新成功
  - 切换到 `/calendar`，验证任务更新反映在日历中

- [ ] **测试 5: 删除任务**
  - 在 `/calendar` 页面删除任务，验证任务消失
  - 切换到 `/`，验证任务已被删除

### 性能测试

- [ ] **测试 6: 测量页面切换时间**
  - 使用浏览器性能工具测量切换时间
  - 预期：< 50ms（几乎瞬间）

- [ ] **测试 7: 网络请求次数**
  - 验证整个会话中只请求一次 `/api/events`
  - 验证创建/编辑/删除操作正常发送请求

---

## 边界情况处理

### 1. 数据同步
**问题：** 两个页面同时修改同一任务
**处理：** Context 中的 updateEvent 方法确保状态一致性

### 2. 加载失败
**问题：** 首次加载 API 失败
**处理：** Context 提供 error 状态，页面显示错误信息和重试按钮

### 3. 乐观更新失败
**问题：** 创建任务的 POST 请求失败
**处理：** 页面层面处理，从 Context 中移除临时任务

### 4. 页面刷新
**问题：** 用户刷新页面，Context 数据丢失
**处理：** EventsProvider 在 useEffect 中自动重新加载数据

---

## 预期效果

### 性能提升
- **首次加载**：500-800ms（与当前相同）
- **页面切换**：0ms（从缓存读取）
- **用户体验**：页面切换瞬间完成，无等待

### 代码质量
- **减少重复代码**：两个页面共享数据加载逻辑
- **更好的状态管理**：集中管理 events 数据
- **更容易维护**：数据操作逻辑集中在 Context 中

### 网络优化
- **减少 API 请求**：从每次切换 2 次请求降至 0 次
- **带宽节省**：避免重复传输相同数据

