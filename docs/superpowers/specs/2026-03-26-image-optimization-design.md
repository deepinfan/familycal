# 图片附件优化设计文档

## 概述

优化文档功能中的图片附件加载体验，实现移动端友好的渐进式加载和完整的图片查看功能。

## 目标

1. **移动端优化**：默认加载缩略图，减少流量消耗
2. **渐进式加载**：点击查看原图时，先显示缩略图放大版，后台加载原图
3. **完整查看器**：支持缩放、切换、下载功能
4. **异步加载**：文档内容优先加载，图片后台异步加载

## 当前状态

### 已实现
- ✅ 后端上传时自动生成 800x800 缩略图（使用 sharp 库）
- ✅ 数据库 Attachment 模型已有 `thumbnail` 字段
- ✅ 缩略图按原图比例生成（fit: "inside"）

### 待实现
- ❌ 前端使用缩略图（当前直接加载原图）
- ❌ 图片查看器组件
- ❌ 渐进式加载逻辑
- ❌ 异步加载优化

## 技术方案

### 架构设计

```
文档页面 (documents/page.tsx)
├── 文档列表渲染
│   ├── 加载文档内容（优先）
│   └── 异步加载图片缩略图（后台）
├── 图片缩略图显示
│   └── 使用 thumbnail URL
└── 图片查看器组件（新增）
    ├── yet-another-react-lightbox
    ├── 渐进式加载（thumbnail → original）
    └── 手势支持（缩放、滑动、下载）
```

### 技术选型

**图片查看器库：** `yet-another-react-lightbox`

**选择理由：**
- 功能完整：缩放、滑动、手势支持开箱即用
- 性能优化：懒加载、虚拟滚动
- 移动端友好：触摸手势、响应式
- 插件系统：Zoom、Download 等插件
- 维护活跃：2024年仍在更新

**依赖大小：** ~50KB（gzipped）

## 数据流设计

### 文档展开时的加载流程

```
1. 用户点击展开文档
   ↓
2. 立即加载文档内容（Markdown）
   ↓
3. 显示内容 + 图片占位符
   ↓
4. 后台异步加载图片缩略图（不阻塞）
   ↓
5. 缩略图加载完成 → 显示
```

### 图片查看流程

```
1. 用户点击缩略图
   ↓
2. 打开 Lightbox，立即显示缩略图放大版
   ↓
3. 后台加载原图
   ↓
4. 显示加载指示器
   ↓
5. 原图加载完成 → 平滑替换缩略图
```

## 组件设计

### 1. 图片缩略图组件（修改现有）

**位置：** `app/(app)/documents/page.tsx`

**修改内容：**
```typescript
// 当前实现（直接加载原图）
<img src={protectedUrl} />

// 优化后（优先使用缩略图）
<img
  src={file.thumbnail || protectedUrl}
  alt={file.filename}
  onClick={() => openLightbox(index)}
  loading="lazy"
  onError={(e) => {
    e.currentTarget.src = '/placeholder-image.svg';
  }}
  style={{ cursor: "pointer" }}
/>
```

### 2. 图片查看器组件（新增）

**位置：** `app/(app)/documents/page.tsx`

**实现：**
```typescript
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Download from "yet-another-react-lightbox/plugins/download";
import "yet-another-react-lightbox/styles.css";

// 状态管理
const [lightboxOpen, setLightboxOpen] = useState(false);
const [lightboxIndex, setLightboxIndex] = useState(0);

// 准备图片数据
const imageAttachments = doc.attachments.filter(f =>
  f.mimetype.startsWith("image/")
);

const slides = imageAttachments.map(img => ({
  src: img.filepath,        // 原图
  thumbnail: img.thumbnail, // 缩略图（渐进式加载）
  alt: img.filename,
  download: img.filepath    // 下载链接
}));

// 渲染查看器
<Lightbox
  open={lightboxOpen}
  close={() => setLightboxOpen(false)}
  index={lightboxIndex}
  slides={slides}
  plugins={[Zoom, Download]}
/>
```

### 3. 异步加载优化

**策略：** 文档内容优先，图片后台加载

```typescript
async function toggleDoc(docId: string) {
  setExpandedDocIds(prev => [...prev, docId]);

  // 1. 立即加载文档内容
  const contentRes = await fetch(`/api/documents/${docId}/content`);
  const { content } = await contentRes.json();

  setData(prev => ({
    ...prev,
    documents: prev.documents.map(d =>
      d.id === docId ? { ...d, content } : d
    )
  }));

  // 2. 后台异步加载图片（不阻塞）
  setTimeout(() => {
    loadAttachments(docId);
  }, 0);
}
```

## 错误处理

### 1. 缩略图加载失败

```typescript
<img
  src={file.thumbnail || protectedUrl}
  onError={(e) => {
    // 降级到原图
    e.currentTarget.src = protectedUrl;
  }}
/>
```

### 2. 原图加载失败

Lightbox 自动处理，保持显示缩略图，不会白屏。

### 3. 网络超时

```typescript
// 设置合理的超时时间
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

fetch(url, { signal: controller.signal })
  .finally(() => clearTimeout(timeoutId));
```

## 性能优化

### 1. 懒加载

- 使用 `loading="lazy"` 属性
- 只加载可视区域的图片

### 2. 缓存策略

- 浏览器自动缓存已加载的图片
- 缩略图和原图分别缓存

### 3. 渐进式加载

- 先显示缩略图（快速响应）
- 后台加载原图（提升质量）
- 平滑过渡（无闪烁）

### 4. 异步加载

- 文档内容优先加载
- 图片后台异步加载
- 不阻塞主线程

## 实现步骤

### 阶段 1：安装依赖

```bash
npm install yet-another-react-lightbox
```

### 阶段 2：修改文档页面

1. 导入 Lightbox 组件和插件
2. 添加状态管理（lightboxOpen, lightboxIndex）
3. 修改图片渲染逻辑（使用 thumbnail）
4. 添加 Lightbox 组件

### 阶段 3：优化加载顺序

1. 修改 toggleDoc 函数
2. 分离内容加载和图片加载
3. 使用 setTimeout 实现异步加载

### 阶段 4：测试验证

1. 移动端测试（缩略图加载）
2. 查看器功能测试（缩放、切换、下载）
3. 性能测试（加载时间对比）
4. 错误处理测试（网络失败场景）

## 预期效果

### 性能提升

- **首次加载时间**：减少 60-80%（缩略图 vs 原图）
- **流量消耗**：减少 70-90%（移动端）
- **用户体验**：即时响应，无白屏等待

### 功能增强

- ✅ 渐进式加载（先模糊后清晰）
- ✅ 缩放手势支持
- ✅ 左右滑动切换
- ✅ 下载功能
- ✅ 关闭按钮

## 风险评估

### 低风险

- 依赖库成熟稳定
- 后端已支持缩略图
- 向下兼容（降级到原图）

### 注意事项

- 确保 thumbnail 字段已存在于数据库
- 旧数据可能没有 thumbnail（需要降级处理）
- 移动端网络环境测试

## 总结

本设计方案通过使用成熟的图片查看器库和渐进式加载策略，在不增加后端复杂度的前提下，显著提升了移动端的图片浏览体验。实现简单，风险可控，预期效果明显。

