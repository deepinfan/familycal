# Vercel 迁移设计文档

**日期：** 2026-03-23
**项目：** FamilyCal
**目标：** 将项目从 VPS 部署迁移到 Vercel，使用 Vercel 免费服务

---

## 1. 概述

### 1.1 迁移目标

将 FamilyCal 项目完全迁移到 Vercel 平台，使用以下 Vercel 免费服务：
- Vercel Postgres（数据库）
- Vercel Blob（文件存储）
- Vercel 环境变量（配置管理）
- Vercel 自动部署（CI/CD）

### 1.2 设计原则

- **最小改动：** 保持现有架构和业务逻辑不变
- **零成本：** 仅使用 Vercel 免费层服务
- **快速迁移：** 预计 1-2 天完成迁移
- **向后兼容：** 保留所有现有功能

---

## 2. 架构设计

### 2.1 目标架构

```
用户浏览器
    ↓
Vercel Edge Network
    ↓
Next.js App (Serverless Functions)
    ↓
├─ Vercel Postgres (数据库)
├─ Vercel Blob (文件存储)
└─ Vercel 环境变量 (配置)
```

### 2.2 核心变化

| 组件 | 当前方案 | 迁移后方案 |
|------|---------|-----------|
| 数据库 | SQLite | Vercel Postgres |
| 文件存储 | 本地文件系统 | Vercel Blob |
| 配置管理 | .env 文件 | Vercel 环境变量 |
| 部署方式 | VPS 手动部署 | Git push 自动部署 |


---

## 3. 数据库迁移

### 3.1 Prisma Schema 调整

**当前配置：**
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

**迁移后配置：**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}
```

### 3.2 数据类型兼容性

| SQLite 类型 | PostgreSQL 类型 | 兼容性 |
|------------|----------------|--------|
| TEXT | VARCHAR/TEXT | ✅ 完全兼容 |
| INTEGER | INTEGER/BIGINT | ✅ 完全兼容 |
| REAL | DOUBLE PRECISION | ✅ 完全兼容 |
| BLOB | BYTEA | ✅ 完全兼容 |

Prisma 会自动处理类型转换，无需手动调整。

### 3.3 迁移步骤

1. 修改 `prisma/schema.prisma` 的 provider
2. 删除旧的 SQLite 迁移文件
3. 生成新的 PostgreSQL 迁移：`npx prisma migrate dev --name init_postgres`
4. 在 Vercel 部署时自动运行迁移


---

## 4. 文件存储迁移

### 4.1 Vercel Blob 集成

**安装依赖：**
```json
"@vercel/blob": "^0.23.0"
```

### 4.2 文件上传改造

**当前实现：** `/api/upload`
- 保存文件到 `public/uploads/`
- 返回本地文件路径

**迁移后实现：**
```typescript
import { put } from '@vercel/blob';

const blob = await put(filename, file, {
  access: 'public',
  token: process.env.BLOB_READ_WRITE_TOKEN
});

// 返回 blob.url
```

### 4.3 文件访问改造

**当前实现：** `/api/files/[filename]`
- 读取本地文件并验证权限
- 返回文件流

**迁移后实现：**
- 直接使用 Blob URL（公开文件）
- 或生成带签名的临时 URL（私有文件）


---

## 5. 环境变量配置

### 5.1 必需变量

**Vercel 自动提供：**
```
POSTGRES_PRISMA_URL
POSTGRES_URL_NON_POOLING
BLOB_READ_WRITE_TOKEN
```

**需手动配置：**
```
JWT_SECRET=<生成的随机密钥>
SYSTEM_CONFIG_AES_KEY=<32字节十六进制密钥>
APP_URL=https://your-app.vercel.app
```

### 5.2 可选变量

```
OPENAI_API_KEY=<可选>
ANTHROPIC_API_KEY=<可选>
DEEPSEEK_API_KEY=<可选>
VAPID_PUBLIC_KEY=<生成的公钥>
VAPID_PRIVATE_KEY=<生成的私钥>
VAPID_SUBJECT=mailto:admin@example.com
```

### 5.3 密钥生成脚本

提供 `scripts/generate-keys.sh` 脚本：
```bash
#!/bin/bash
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "SYSTEM_CONFIG_AES_KEY=$(openssl rand -hex 32)"
```


---

## 6. 部署流程

### 6.1 准备阶段

1. 在 Vercel 创建新项目
2. 连接 GitHub 仓库（deepinfan/familycal）
3. 在项目中添加 Postgres 数据库
4. 在项目中添加 Blob 存储

### 6.2 配置阶段

1. 设置所有环境变量（见第5节）
2. 配置构建命令：`prisma generate && next build`
3. 配置输出目录：`.next`
4. 配置 Node.js 版本：18.x

### 6.3 首次部署

1. Git push 触发自动部署
2. Vercel 自动运行构建
3. 部署成功后运行数据库迁移
4. 访问部署 URL 验证功能

### 6.4 持续部署

- master 分支 push → 生产环境自动部署
- Pull Request → 预览环境自动创建
- 部署失败 → 自动回滚到上一版本


---

## 7. 代码改动清单

### 7.1 必须修改的文件

1. **prisma/schema.prisma**
   - 修改 provider 为 postgresql
   - 修改 url 为 POSTGRES_PRISMA_URL
   - 添加 directUrl

2. **app/api/upload/route.ts**
   - 导入 @vercel/blob
   - 替换文件保存逻辑为 Blob 上传

3. **app/api/files/[filename]/route.ts**
   - 可选：简化为重定向到 Blob URL
   - 或保留权限验证逻辑

4. **package.json**
   - 添加 @vercel/blob 依赖

### 7.2 需要删除的文件

- `prisma/migrations/` 下的所有 SQLite 迁移
- `public/uploads/` 目录（如果存在）

### 7.3 需要新增的文件

- `scripts/generate-keys.sh` - 密钥生成脚本
- `vercel.json` - Vercel 配置文件（可选）


---

## 8. 验证测试

### 8.1 功能测试清单

- [ ] 用户登录/登出
- [ ] 创建/编辑/删除任务
- [ ] 日历视图（周/月）
- [ ] 创建/编辑/删除文档
- [ ] 文件上传/下载
- [ ] 推送通知订阅
- [ ] 语言切换
- [ ] 主题切换
- [ ] 管理员功能

### 8.2 性能测试

- 数据库查询响应时间 < 500ms
- 文件上传响应时间 < 2s
- 页面加载时间 < 3s


---

## 9. 风险评估

### 9.1 免费额度限制

| 服务 | 免费额度 | 预估使用 | 风险等级 |
|------|---------|---------|---------|
| Vercel Postgres | 60小时/月 | <10小时/月 | 低 |
| Vercel Blob | 1GB存储 | <100MB | 低 |
| Serverless Functions | 100GB-小时 | <10GB-小时 | 低 |

**结论：** 家庭使用场景下，不会超出免费额度。

### 9.2 技术风险

- **数据库迁移：** 低风险，Prisma 自动处理
- **文件存储：** 低风险，API 简单
- **部署配置：** 低风险，Vercel 自动化程度高

---

## 10. 迁移时间表

- **第1天：** 代码改动、本地测试
- **第2天：** Vercel 配置、部署验证

**总计：** 1-2天完成迁移

