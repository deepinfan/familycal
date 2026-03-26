# 图片附件优化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现移动端友好的图片附件渐进式加载和完整的图片查看器功能

**Architecture:**
- 使用 yet-another-react-lightbox 库实现图片查看器
- 优先加载缩略图，点击后渐进式加载原图
- 文档内容优先加载，图片后台异步加载

**Tech Stack:**
- yet-another-react-lightbox (图片查看器)
- React hooks (状态管理)
- Vercel Blob (图片存储，已有)

---

## Task 1: 安装依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装 lightbox 库**

```bash
npm install yet-another-react-lightbox
```

Expected: 依赖安装成功，package.json 更新

- [ ] **Step 2: 验证安装**

```bash
npm list yet-another-react-lightbox
```

Expected: 显示已安装的版本号

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add yet-another-react-lightbox for image viewer

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: 添加 Lightbox 导入和状态

**Files:**
- Modify: `app/(app)/documents/page.tsx:1-10`

- [ ] **Step 1: 添加 Lightbox 导入**

在文件顶部添加导入：

```typescript
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Download from "yet-another-react-lightbox/plugins/download";
import "yet-another-react-lightbox/styles.css";
```

- [ ] **Step 2: 添加状态管理**

在 DocumentsPage 组件中，在现有状态后添加：

```typescript
const [lightboxOpen, setLightboxOpen] = useState(false);
const [lightboxIndex, setLightboxIndex] = useState(0);
const [lightboxImages, setLightboxImages] = useState<Array<{
  src: string;
  thumbnail?: string;
  alt: string;
}>>([]);
```

- [ ] **Step 3: 验证编译**

```bash
npm run build
```

Expected: 编译成功，无类型错误

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/documents/page.tsx"
git commit -m "feat: add lightbox imports and state management

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: 修改图片渲染逻辑使用缩略图

**Files:**
- Modify: `app/(app)/documents/page.tsx:793-860`

- [ ] **Step 1: 创建打开 Lightbox 的函数**

在组件中添加函数：

```typescript
function openLightbox(docId: string, imageIndex: number) {
  const doc = data?.documents.find(d => d.id === docId);
  if (!doc) return;

  const images = doc.attachments
    .filter(f => f.mimetype.startsWith("image/"))
    .map(f => ({
      src: `/api/files/${f.filepath.split('/').pop()}`,
      thumbnail: f.thumbnail,
      alt: f.filename
    }));

  setLightboxImages(images);
  setLightboxIndex(imageIndex);
  setLightboxOpen(true);
}
```

- [ ] **Step 2: 修改图片渲染使用缩略图**

找到图片渲染部分（约第 812 行），将 `src={protectedUrl}` 改为 `src={file.thumbnail || protectedUrl}`，并添加 onClick 处理：

```typescript
onClick={() => {
  const imageIndex = doc.attachments
    .filter(f => f.mimetype.startsWith("image/"))
    .findIndex(f => f.id === file.id);
  openLightbox(doc.id, imageIndex);
}}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/documents/page.tsx"
git commit -m "feat: use thumbnail for image display and add lightbox handler

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: 添加 Lightbox 组件到页面

**Files:**
- Modify: `app/(app)/documents/page.tsx:900-914`

- [ ] **Step 1: 移除旧的图片预览模态框**

找到并删除现有的 viewingImage 状态和相关代码（约第 76、900-913 行）

- [ ] **Step 2: 添加 Lightbox 组件**

在 `</main>` 标签之前添加：

```typescript
<Lightbox
  open={lightboxOpen}
  close={() => setLightboxOpen(false)}
  index={lightboxIndex}
  slides={lightboxImages}
  plugins={[Zoom, Download]}
  zoom={{
    maxZoomPixelRatio: 3,
    scrollToZoom: true
  }}
/>
```

- [ ] **Step 3: 测试功能**

```bash
npm run dev
```

在浏览器中测试：点击图片 → 打开查看器 → 缩放 → 切换 → 下载

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/documents/page.tsx"
git commit -m "feat: add lightbox component with zoom and download

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: 优化加载顺序

**Files:**
- Modify: `app/(app)/documents/page.tsx:269-314`

- [ ] **Step 1: 修改 toggleDoc 函数优化加载顺序**

找到 toggleDoc 函数，修改为先加载内容，后加载图片：

```typescript
async function toggleDoc(docId: string) {
  const isExpanding = !expandedDocIds.includes(docId);

  setExpandedDocIds((prev) => {
    const next = prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId];
    localStorage.setItem("expandedDocIds", JSON.stringify(next));
    return next;
  });

  if (isExpanding && data) {
    const doc = data.documents.find(d => d.id === docId);
    if (doc) {
      // 1. 优先加载文档内容
      if (!doc.content) {
        const contentRes = await fetch(`/api/documents/${docId}/content`, {
          headers: { "Accept-Language": language === "zh" ? "zh-CN" : "en-US" }
        });
        if (contentRes.ok) {
          const contentJson = await contentRes.json();
          setData(prev => prev ? {
            ...prev,
            documents: prev.documents.map(d =>
              d.id === docId ? { ...d, content: contentJson.content } : d
            )
          } : null);
        }
      }

      // 2. 后台异步加载图片（不阻塞）
      setTimeout(() => {
        if (doc.attachments.length === 0) {
          fetch(`/api/documents/${docId}/attachments`)
            .then(res => res.json())
            .then(attachJson => {
              setData(prev => prev ? {
                ...prev,
                documents: prev.documents.map(d =>
                  d.id === docId ? { ...d, attachments: attachJson.attachments } : d
                )
              } : null);
            });
        }
      }, 0);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/documents/page.tsx"
git commit -m "perf: optimize loading order - content first, images async

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: 测试和验证

- [ ] **Step 1: 运行构建测试**

```bash
npm run build
```

Expected: 构建成功，无错误

- [ ] **Step 2: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 3: 手动测试**

测试清单：
- [ ] 文档展开时，内容立即显示
- [ ] 图片缩略图后台加载
- [ ] 点击缩略图打开查看器
- [ ] 查看器显示缩略图，后台加载原图
- [ ] 双指缩放功能正常
- [ ] 左右滑动切换图片
- [ ] 下载按钮功能正常
- [ ] 关闭按钮功能正常
- [ ] 移动端测试（Chrome DevTools）

- [ ] **Step 4: 推送到 GitHub**

```bash
git push origin master
```

Expected: 推送成功

