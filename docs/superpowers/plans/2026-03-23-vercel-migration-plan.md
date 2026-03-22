# Vercel 迁移实施计划

**日期：** 2026-03-23
**项目：** FamilyCal
**基于规范：** docs/superpowers/specs/2026-03-23-vercel-migration-design.md

---

## 阶段 1：数据库迁移准备

### 任务 1.1：修改 Prisma Schema
**文件：** `prisma/schema.prisma`
**操作：**
- 修改 `provider` 从 `"sqlite"` 改为 `"postgresql"`
- 修改 `url` 从 `env("DATABASE_URL")` 改为 `env("POSTGRES_PRISMA_URL")`
- 添加 `directUrl = env("POSTGRES_URL_NON_POOLING")`

**验证：**
- 运行 `npx prisma validate` 确认 schema 有效

### 任务 1.2：删除旧的 SQLite 迁移
**文件：** `prisma/migrations/`
**操作：**
- 删除所有现有的迁移文件
- 保留 `prisma/migrations` 目录结构

**验证：**
- 确认 `prisma/migrations/` 目录为空或仅包含 `.gitkeep`

### 任务 1.3：生成新的 PostgreSQL 迁移
**命令：**
```bash
npx prisma migrate dev --name init_postgres
```

**验证：**
- 确认生成了新的迁移文件
- 检查迁移 SQL 语法正确

---

## 阶段 2：文件存储迁移

### 任务 2.1：安装 Vercel Blob 依赖
**文件：** `package.json`
**操作：**
- 添加依赖：`"@vercel/blob": "^0.23.0"`

**命令：**
```bash
npm install @vercel/blob
```

**验证：**
- 确认 `package.json` 和 `package-lock.json` 已更新

### 任务 2.2：改造文件上传 API
**文件：** `app/api/upload/route.ts`
**操作：**
- 导入 `@vercel/blob`
- 替换文件系统写入逻辑为 Blob 上传
- 使用 `put()` 方法上传文件
- 返回 Blob URL 而非本地路径

**关键代码：**
```typescript
import { put } from '@vercel/blob';

const blob = await put(filename, file, {
  access: 'public',
  token: process.env.BLOB_READ_WRITE_TOKEN
});

return NextResponse.json({
  filename: file.name,
  filepath: blob.url,
  mimetype: file.type,
  size: file.size
});
```

**验证：**
- 代码编译无错误
- 类型检查通过

### 任务 2.3：更新文件访问逻辑（可选）
**文件：** `app/api/files/[filename]/route.ts`
**操作：**
- 根据设计方案 A，此文件可能不再需要
- 如果保留，需要改为重定向到 Blob URL

**决策点：** 是否完全移除此 API 或保留权限验证

---

## 阶段 3：环境变量配置

### 任务 3.1：创建密钥生成脚本
**文件：** `scripts/generate-keys.sh`
**操作：**
- 创建脚本生成 JWT_SECRET 和 SYSTEM_CONFIG_AES_KEY

**内容：**
```bash
#!/bin/bash
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "SYSTEM_CONFIG_AES_KEY=$(openssl rand -hex 32)"
```

**验证：**
- 运行脚本确认能生成密钥
- 添加执行权限：`chmod +x scripts/generate-keys.sh`

### 任务 3.2：创建 .env.example 更新
**文件：** `.env.example`
**操作：**
- 更新数据库配置示例
- 添加 Vercel 特定的环境变量

**内容：**
```env
# Vercel Postgres (自动提供)
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Vercel Blob (自动提供)
BLOB_READ_WRITE_TOKEN=

# 手动配置
JWT_SECRET=
SYSTEM_CONFIG_AES_KEY=
APP_URL=https://your-app.vercel.app

# 可选
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com
```

**验证：**
- 确认所有必需变量都已列出

---

## 阶段 4：构建配置

### 任务 4.1：更新 package.json 构建脚本
**文件：** `package.json`
**操作：**
- 更新 build 脚本以包含 Prisma 生成和迁移

**修改：**
```json
"build": "prisma generate && prisma migrate deploy && next build"
```

**验证：**
- 本地运行 `npm run build` 测试（需要配置环境变量）

### 任务 4.2：创建 Vercel 配置文件（可选）
**文件：** `vercel.json`
**操作：**
- 创建 Vercel 配置文件（如果需要自定义配置）

**内容（可选）：**
```json
{
  "buildCommand": "prisma generate && prisma migrate deploy && next build",
  "outputDirectory": ".next",
  "framework": "nextjs"
}
```

**验证：**
- 确认 JSON 格式正确

---

## 阶段 5：文档更新

### 任务 5.1：更新 README.md
**文件：** `README.md`
**操作：**
- 添加 Vercel 部署说明
- 更新环境变量配置部分
- 添加 Vercel Postgres 和 Blob 说明

**验证：**
- 确认文档清晰易懂

### 任务 5.2：更新 DEPLOYMENT.md
**文件：** `DEPLOYMENT.md`
**操作：**
- 添加 Vercel 部署章节
- 保留 VPS 部署说明作为备选方案

**验证：**
- 确认部署步骤完整

---

## 阶段 6：Vercel 平台配置

### 任务 6.1：创建 Vercel 项目
**平台：** Vercel Dashboard
**操作：**
1. 登录 Vercel
2. 点击 "Add New Project"
3. 导入 GitHub 仓库 `deepinfan/familycal`
4. 选择 Framework Preset: Next.js

**验证：**
- 项目创建成功

### 任务 6.2：添加 Postgres 数据库
**平台：** Vercel Dashboard
**操作：**
1. 进入项目设置
2. 选择 "Storage" 标签
3. 点击 "Create Database"
4. 选择 "Postgres"
5. 选择免费计划

**验证：**
- 数据库创建成功
- 环境变量自动添加（POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING）

### 任务 6.3：添加 Blob 存储
**平台：** Vercel Dashboard
**操作：**
1. 进入项目设置
2. 选择 "Storage" 标签
3. 点击 "Create Store"
4. 选择 "Blob"

**验证：**
- Blob 存储创建成功
- 环境变量自动添加（BLOB_READ_WRITE_TOKEN）

### 任务 6.4：配置环境变量
**平台：** Vercel Dashboard
**操作：**
1. 进入项目设置
2. 选择 "Environment Variables" 标签
3. 添加以下变量：
   - JWT_SECRET（运行 generate-keys.sh 生成）
   - SYSTEM_CONFIG_AES_KEY（运行 generate-keys.sh 生成）
   - APP_URL（使用 Vercel 提供的域名）
   - 可选：OPENAI_API_KEY, ANTHROPIC_API_KEY, DEEPSEEK_API_KEY
   - 可选：VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

**验证：**
- 所有必需变量已配置
- 变量值正确无误

---

## 阶段 7：首次部署

### 任务 7.1：推送代码触发部署
**操作：**
```bash
git add .
git commit -m "feat: migrate to Vercel with Postgres and Blob"
git push origin main
```

**验证：**
- Vercel 自动触发构建
- 构建日志无错误

### 任务 7.2：验证部署
**操作：**
1. 访问 Vercel 提供的部署 URL
2. 测试登录功能
3. 测试任务创建
4. 测试文件上传
5. 测试文档创建

**验证清单：**
- [ ] 页面正常加载
- [ ] 用户可以登录
- [ ] 可以创建任务
- [ ] 可以上传文件
- [ ] 可以创建文档
- [ ] 日历视图正常
- [ ] 语言切换正常
- [ ] 主题切换正常

---

## 阶段 8：数据初始化

### 任务 8.1：运行 Seed 脚本
**操作：**
- 在 Vercel Dashboard 或本地连接到 Vercel Postgres
- 运行 seed 脚本初始化角色数据

**命令（本地）：**
```bash
# 设置 Vercel Postgres 连接
export POSTGRES_PRISMA_URL="<from Vercel>"
export POSTGRES_URL_NON_POOLING="<from Vercel>"

# 运行 seed
npx prisma db seed
```

**验证：**
- 管理员账号创建成功
- 默认角色创建成功
- 可以使用 admin/admin123 登录

---

## 阶段 9：性能和安全测试

### 任务 9.1：性能测试
**测试项：**
- 数据库查询响应时间 < 500ms
- 文件上传响应时间 < 2s
- 页面加载时间 < 3s

**验证：**
- 使用浏览器开发者工具测试
- 记录性能指标

### 任务 9.2：安全测试
**测试项：**
- 未登录用户无法访问受保护 API
- 文件上传大小限制生效
- 文件类型限制生效
- JWT token 正确验证

**验证：**
- 手动测试各项安全功能

---

## 阶段 10：监控和优化

### 任务 10.1：监控 Vercel 使用量
**操作：**
- 在 Vercel Dashboard 查看使用统计
- 监控 Postgres 计算时间
- 监控 Blob 存储使用量
- 监控 Serverless Functions 调用次数

**验证：**
- 确认在免费额度范围内

### 任务 10.2：设置告警（可选）
**操作：**
- 配置 Vercel 告警通知
- 设置使用量阈值提醒

**验证：**
- 告警配置生效

---

## 回滚计划

如果部署失败或出现严重问题：

1. **立即回滚：** 在 Vercel Dashboard 点击 "Rollback" 回到上一个版本
2. **数据库回滚：** 使用 `prisma migrate resolve --rolled-back` 标记迁移
3. **完全回滚到 VPS：**
   - 停用 Vercel 项目
   - 恢复 VPS 部署
   - 更新 DNS 指向 VPS

---

## 成功标准

- [ ] 所有功能正常工作
- [ ] 性能指标达标
- [ ] 安全测试通过
- [ ] 在免费额度范围内
- [ ] 文档完整更新
- [ ] 用户可以正常使用所有功能

---

## 预计时间

- **阶段 1-5（代码改动）：** 4-6 小时
- **阶段 6-8（Vercel 配置和部署）：** 2-3 小时
- **阶段 9-10（测试和优化）：** 2-3 小时

**总计：** 8-12 小时（1-2 天）
