# 任务附件功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为任务添加附件上传和显示功能，支持图片缩略图和文件下载

**Architecture:** 复用文档附件的 Attachment 模型，添加 eventId 字段支持任务关联。前端按需加载附件，图片使用缩略图+Lightbox，文件提供下载链接。

**Tech Stack:** Prisma, PostgreSQL, Next.js, React, Vercel Blob, yet-another-react-lightbox

---

## 文件结构

**数据库：**
- Modify: `prisma/schema.prisma` - 修改 Attachment 和 Event 模型

**后端 API：**
- Modify: `app/api/events/route.ts` - 任务创建 API 添加附件支持
- Create: `app/api/events/[id]/attachments/route.ts` - 任务附件查询 API

**前端：**
- Modify: `app/(app)/events-context.tsx` - EventItem 类型添加 attachments 字段
- Modify: `app/(app)/task-create-form.tsx` - 添加文件上传组件
- Modify: `app/(app)/page.tsx` - 任务卡片添加附件显示

---

## Task 1: 修改数据库模型

**Files:**
- Modify: `prisma/schema.prisma:95-105`

- [ ] **Step 1: 修改 Attachment 模型**

将 `documentId` 改为可选，添加 `eventId` 字段：

```prisma
model Attachment {
  id         String    @id @default(cuid())
  documentId String?
  document   Document? @relation(fields: [documentId], references: [id], onDelete: Cascade)
  eventId    String?
  event      Event?    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  filename   String
  filepath   String
  thumbnail  String?
  mimetype   String
  size       Int
  createdAt  DateTime  @default(now())
}
```

- [ ] **Step 2: 修改 Event 模型**

在 Event 模型中添加 attachments 关系（第 42 行后）：

```prisma
model Event {
  id         String          @id @default(cuid())
  titleZh    String
  titleEn    String
  datetime   DateTime
  type       String
  repeatCycle String         @default("none")
  repeatUntil DateTime?
  status     String          @default("pending")
  creatorId  String
  creator    Role            @relation("creator", fields: [creatorId], references: [id])
  issuedById String
  issuedBy   Role            @relation("issuer", fields: [issuedById], references: [id])
  assignees  EventAssignee[]
  attachments Attachment[]
  logs       EventLog[]
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt
}
```

- [ ] **Step 3: 生成并应用迁移**

```bash
npx prisma migrate dev --name add_event_attachments
```

Expected: 迁移文件生成并应用成功

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add event attachments support to database schema

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 修改任务创建 API

**Files:**
- Modify: `app/api/events/route.ts:9-38`

- [ ] **Step 1: 修改 createEventSchema**

在 schema 中添加 attachments 字段（第 18 行后）：

```typescript
attachments: z.array(z.object({
  filename: z.string(),
  filepath: z.string(),
  thumbnail: z.string().nullable().optional(),
  mimetype: z.string(),
  size: z.number()
})).optional().default([])
```

- [ ] **Step 2: 找到任务创建逻辑位置**

```bash
grep -n "prisma.event.create" app/api/events/route.ts
```

Expected: 找到创建任务的代码行号

- [ ] **Step 3: 修改任务创建逻辑**

在 prisma.event.create 的 data 中添加 attachments：

```typescript
attachments: {
  createMany: {
    data: parsed.data.attachments
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/events/route.ts
git commit -m "feat: add attachments support to event creation API

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: 新增任务附件查询 API

**Files:**
- Create: `app/api/events/[id]/attachments/route.ts`

- [ ] **Step 1: 创建 API 文件**

创建完整的附件查询 API：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      assignees: { select: { roleId: true } },
      issuedBy: { select: { id: true } }
    }
  });

  if (!event) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  const isAssignee = event.assignees.some(a => a.roleId === auth.roleId);
  const isIssuer = event.issuedBy.id === auth.roleId;

  if (!isAssignee && !isIssuer) {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const attachments = await prisma.attachment.findMany({
    where: { eventId: params.id },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ attachments });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/events/[id]/attachments/route.ts
git commit -m "feat: add event attachments query API

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: 修改前端类型定义

**Files:**
- Modify: `app/(app)/events-context.tsx:11-24`

- [ ] **Step 1: 添加 Attachment 类型定义**

在文件顶部添加 Attachment 类型（第 10 行后）：

```typescript
type Attachment = {
  id: string;
  filename: string;
  filepath: string;
  thumbnail?: string;
  mimetype: string;
  size: number;
};
```

- [ ] **Step 2: 修改 EventItem 类型**

在 EventItem 类型中添加 attachments 字段（第 23 行后）：

```typescript
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
  attachments?: Attachment[];
  isSaving?: boolean;
};
```

- [ ] **Step 3: 导出 Attachment 类型**

在文件末尾的 export 语句中添加 Attachment：

```typescript
export type { EventItem, Role, Attachment };
```

- [ ] **Step 4: Commit**

```bash
git add app/(app)/events-context.tsx
git commit -m "feat: add attachments field to EventItem type

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: 修改任务创建表单

**Files:**
- Modify: `app/(app)/task-create-form.tsx`

- [ ] **Step 1: 添加文件上传状态**

在组件顶部添加状态（参考文档页面的实现）：

```typescript
const [uploadedFiles, setUploadedFiles] = useState<Array<{
  filename: string;
  filepath: string;
  thumbnail?: string;
  mimetype: string;
  size: number;
}>>([]);
const [uploading, setUploading] = useState(false);
```

- [ ] **Step 2: 添加文件上传处理函数**

复用文档页面的 handleFileUpload 逻辑：

```typescript
async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  setUploading(true);
  try {
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error(`上传 ${file.name} 失败`);
      return res.json();
    });
    const results = await Promise.all(uploadPromises);
    setUploadedFiles((prev) => [...prev, ...results]);
  } catch (err) {
    console.error(err);
  } finally {
    setUploading(false);
  }
}
```

- [ ] **Step 3: 在表单中添加文件上传组件**

在表单中添加文件上传输入框和已上传文件列表。

- [ ] **Step 4: 修改提交逻辑**

在 onSubmit 回调中传递 uploadedFiles。

- [ ] **Step 5: Commit**

```bash
git add app/(app)/task-create-form.tsx
git commit -m "feat: add file upload to task creation form

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: 修改任务卡片显示附件

**Files:**
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: 添加附件加载状态**

在组件中添加状态：

```typescript
const [loadingAttachments, setLoadingAttachments] = useState<Set<string>>(new Set());
```

- [ ] **Step 2: 创建附件加载函数**

```typescript
async function loadAttachments(eventId: string) {
  if (loadingAttachments.has(eventId)) return;

  setLoadingAttachments(prev => new Set(prev).add(eventId));
  const res = await fetch(`/api/events/${eventId}/attachments`);
  if (res.ok) {
    const { attachments } = await res.json();
    modifyEvent(eventId, { attachments });
  }
  setLoadingAttachments(prev => {
    const next = new Set(prev);
    next.delete(eventId);
    return next;
  });
}
```

- [ ] **Step 3: 在任务展开时加载附件**

修改任务卡片的点击处理，在展开时加载附件。

- [ ] **Step 4: 添加附件显示组件**

在 renderCard 函数中添加附件显示逻辑（复用文档页面的实现）：
- 图片：显示缩略图，点击打开 Lightbox
- 文件：显示下载链接

- [ ] **Step 5: Commit**

```bash
git add app/(app)/page.tsx
git commit -m "feat: add attachments display to task cards

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## 测试验证

- [ ] 本地测试任务创建（带附件）
- [ ] 测试任务列表展开加载附件
- [ ] 测试图片缩略图和 Lightbox
- [ ] 测试文件下载链接
- [ ] 推送到 Vercel 验证线上环境
