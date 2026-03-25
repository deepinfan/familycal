# 任务提交性能优化设计文档

**日期：** 2026-03-25
**目标：** 优化任务创建流程，实现瞬间提交反馈，减少等待时间

## 1. 背景与问题

### 当前问题
用户创建任务后需要等待 1-2 秒才能看到任务出现在列表中，体验较慢。

### 性能瓶颈分析

**当前流程：**
```
用户点击创建
  ↓
验证输入
  ↓
POST /api/events (500-800ms)
  ↓
等待服务器响应
  ↓
调用 loadEvents()
  ↓
GET /api/events (500-800ms)
  ↓
获取所有事件
  ↓
更新UI
```

**问题点：**
1. **双重网络请求**：POST 创建 + GET 获取全部，造成 1-2 秒延迟
2. **不必要的数据获取**：POST 响应已包含创建的事件，但被忽略
3. **无即时反馈**：用户需要等待两次网络往返才能看到结果

## 2. 解决方案设计

### 选择方案：瞬间+可靠（混合方案）

**优化后的流程：**
```
用户点击创建
  ↓
生成临时任务对象
  ↓
立即添加到UI（乐观更新）← 用户立即看到任务
  ↓
显示"保存中..."标识
  ↓
POST /api/events (500-800ms，后台进行)
  ↓
成功：用真实数据替换临时任务
失败：移除临时任务，显示错误
```

**性能提升：**
- **即时反馈**：0ms（任务立即显示）
- **确认时间**：500-800ms（仅POST请求）
- **总体提升**：从 1-2 秒降至 0.5-0.8 秒，且有即时视觉反馈

## 3. 实现细节

### 3.1 核心实现逻辑

**步骤1：生成临时任务对象**
```typescript
const tempId = `temp-${Date.now()}`;
const tempEvent: EventItem = {
  id: tempId,
  titleZh: createTitleZh,
  titleEn: "",
  datetime: new Date(`${createManualDate}T${createManualTime}`).toISOString(),
  type: createType,
  repeatCycle: createRepeatCycle,
  repeatUntil: createRepeatCycle === "none" ? null : new Date(`${createRepeatUntil}T23:59:59.999`).toISOString(),
  status: "pending",
  creator: currentRole,
  issuedBy: currentRole,
  assignees: roles.filter(r => createAssigneeRoleIds.includes(r.id)),
  isSaving: true  // 标识保存中
};
```

**步骤2：乐观更新UI**
```typescript
setEvents(prev => [...prev, tempEvent].sort(
  (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
));
```

**步骤3：发送POST请求**
```typescript
setCreatingTask(true);
const res = await fetch("/api/events", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ /* ... */ })
});
setCreatingTask(false);
```

**步骤4：成功处理**
```typescript
const { event } = await res.json();
setEvents(prev => prev.map(e =>
  e.id === tempId ? event : e
));
```

**步骤5：失败处理**
```typescript
setEvents(prev => prev.filter(e => e.id !== tempId));
setWeekNotice(errorMessage);
```

### 3.2 需要修改的文件

**1. app/(app)/calendar/page.tsx**
- 修改 `createEventForDay` 函数（lines 227-270）
- 添加临时任务生成逻辑
- 添加乐观更新逻辑
- 移除 `await loadEvents()` 调用
- 使用POST响应数据更新状态

**2. app/(app)/page.tsx**
- 修改 `createEvent` 函数（lines 212-265）
- 修改解析任务的内联提交处理器（lines 632-678）
- 添加临时任务生成逻辑
- 添加乐观更新逻辑
- 移除 `await loadEvents()` 调用
- 使用POST响应数据更新状态

**3. 类型定义扩展**
- 在 EventItem 类型中添加可选字段 `isSaving?: boolean`

## 4. 边界情况处理

### 4.1 重复任务
**问题：** POST 创建重复任务时，服务器会创建多个事件，但只返回第一个事件对象。

**处理方案：**
- 乐观更新时只显示第一个任务
- 成功后用返回的事件替换临时任务
- 显示提示："已创建 X 个重复任务"
- 其他重复任务在用户切换日期或刷新时自然显示

### 4.2 网络失败
**处理：**
- 移除临时任务
- 显示错误消息
- 用户可以重试

### 4.3 并发创建
**处理：**
- 每个临时任务使用唯一ID（`temp-${Date.now()}`）
- 多个临时任务可以同时存在
- 各自独立处理成功/失败

### 4.4 验证失败
**处理：**
- 在发送请求前验证
- 验证失败时不创建临时任务
- 直接显示错误消息

## 5. 测试计划

### 5.1 功能测试
- [ ] 创建普通任务，验证立即显示
- [ ] 创建重复任务，验证提示信息
- [ ] 网络失败时，验证任务被移除
- [ ] 验证失败时，验证不创建临时任务
- [ ] 并发创建多个任务，验证各自独立处理

### 5.2 性能测试
- [ ] 测量点击到显示的时间（应为 0ms）
- [ ] 测量完整确认时间（应为 500-800ms）
- [ ] 对比优化前后的用户体验

### 5.3 UI测试
- [ ] 验证"保存中..."标识显示正确
- [ ] 验证任务在列表中正确排序
- [ ] 验证失败后错误消息显示正确

## 6. 实施步骤

1. 修改类型定义，添加 `isSaving` 字段
2. 修改 calendar/page.tsx 的 `createEventForDay` 函数
3. 修改 page.tsx 的 `createEvent` 函数
4. 修改 page.tsx 的解析任务提交处理器
5. 测试所有创建任务场景
6. 提交代码

## 7. 预期效果

- **用户体验**：任务创建感觉"瞬间完成"
- **性能提升**：从 1-2 秒降至 0.5-0.8 秒
- **可靠性**：保持与当前实现相同的可靠性
- **代码质量**：减少不必要的网络请求，提高效率

