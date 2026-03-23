# Vercel 部署配置清单

## 前提条件

- [ ] 代码已推送到 GitHub
- [ ] 有 Vercel 账号（使用 GitHub 登录）
- [ ] 本地生成了密钥（运行 `bash scripts/generate-keys.sh`）

## 步骤 1：创建项目

1. 访问 https://vercel.com/dashboard
2. 点击 "Add New Project"
3. 选择 `familycal` 仓库
4. 点击 "Deploy"（首次会失败，正常）

## 步骤 2：添加 Postgres

1. 项目页面 → Storage → Create Database
2. 选择 Postgres → 选择区域 → Create
3. 自动添加环境变量：
   - POSTGRES_PRISMA_URL
   - POSTGRES_URL_NON_POOLING

## 步骤 3：添加 Blob

1. Storage → Create Store → Blob → Create
2. 自动添加环境变量：
   - BLOB_READ_WRITE_TOKEN

## 步骤 4：配置环境变量

Settings → Environment Variables → 添加：

```
JWT_SECRET=<从 generate-keys.sh 获取>
SYSTEM_CONFIG_AES_KEY=<从 generate-keys.sh 获取>
APP_URL=https://your-app.vercel.app
```

可选：
```
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
DEEPSEEK_API_KEY=
```

## 步骤 5：重新部署

1. Deployments → 最新部署 → 三个点 → Redeploy
2. 等待构建完成

## 步骤 6：验证

访问部署 URL，测试：
- [ ] 登录（admin/admin123）
- [ ] 创建任务
- [ ] 上传文件
- [ ] 创建文档

## 完成！

首次登录后立即修改密码。
