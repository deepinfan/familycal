# 部署指南 | Deployment Guide

[中文](#中文) | [English](#english)

---

## 中文

### Vercel 部署（推荐）

#### 1. 准备工作

- GitHub 账号
- Vercel 账号（可使用 GitHub 登录）
- 已 Fork 本项目到你的 GitHub

#### 2. 创建 Vercel 项目

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New Project"
3. 选择你 Fork 的 `familycal` 仓库
4. Framework Preset 会自动识别为 Next.js
5. 点击 "Deploy"（先不配置环境变量，首次部署会失败，这是正常的）

#### 3. 添加 Postgres 数据库

1. 进入项目设置页面
2. 点击 "Storage" 标签
3. 点击 "Create Database"
4. 选择 "Postgres"
5. 选择区域（建议选择离用户最近的区域）
6. 点击 "Create"

Vercel 会自动添加以下环境变量：
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_URL`

#### 4. 添加 Blob 存储

1. 在 "Storage" 标签中
2. 点击 "Create Store"
3. 选择 "Blob"
4. 点击 "Create"

Vercel 会自动添加环境变量：
- `BLOB_READ_WRITE_TOKEN`

#### 5. 配置环境变量

1. 进入项目设置
2. 点击 "Environment Variables" 标签
3. 添加以下变量：

**必需变量：**
```
JWT_SECRET=<运行 scripts/generate-keys.sh 生成>
SYSTEM_CONFIG_AES_KEY=<运行 scripts/generate-keys.sh 生成>
APP_URL=https://your-app.vercel.app
```

**可选变量：**
```
OPENAI_API_KEY=<你的 OpenAI API Key>
ANTHROPIC_API_KEY=<你的 Anthropic API Key>
DEEPSEEK_API_KEY=<你的 DeepSeek API Key>
VAPID_PUBLIC_KEY=<运行 web-push generate-vapid-keys 生成>
VAPID_PRIVATE_KEY=<运行 web-push generate-vapid-keys 生成>
VAPID_SUBJECT=mailto:admin@example.com
```

生成密钥命令：
```bash
# 克隆项目到本地
git clone https://github.com/yourusername/familycal.git
cd familycal

# 生成 JWT 和 AES 密钥
bash scripts/generate-keys.sh

# 生成 VAPID 密钥（可选）
npm install -g web-push
web-push generate-vapid-keys
```

#### 6. 重新部署

1. 在 Vercel Dashboard 点击 "Deployments" 标签
2. 点击最新部署右侧的三个点
3. 选择 "Redeploy"
4. 等待部署完成

#### 7. 初始化数据

部署成功后，数据库会自动运行迁移。访问你的应用 URL：

- 默认管理员账号：`admin`
- 默认密码：`admin123`

**⚠️ 首次登录后请立即修改密码！**

#### 8. 自定义域名（可选）

1. 在项目设置中点击 "Domains"
2. 添加你的自定义域名
3. 按照提示配置 DNS
4. 更新环境变量 `APP_URL` 为你的自定义域名

---

### VPS 服务器部署

#### 1. 服务器要求

- Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- 至少 1GB RAM
- Node.js 18+
- Nginx (推荐)
- PM2 (进程管理)

#### 2. 安装 Node.js

```bash
# 使用 NodeSource 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### 3. 安装 PM2

```bash
sudo npm install -g pm2
```

#### 4. 克隆项目

```bash
cd /var/www
sudo git clone https://github.com/deepinfan/familycal.git
cd familycal
sudo chown -R $USER:$USER .
```

#### 5. 安装依赖

```bash
npm install
```

#### 6. 配置环境变量

```bash
cp .env.example .env
nano .env
```

编辑 `.env` 文件：

```env
DATABASE_URL="file:./prod.db"
JWT_SECRET="生成一个强随机密钥"
SYSTEM_CONFIG_AES_KEY="生成一个32字节的密钥"
APP_URL="https://yourdomain.com"
```

生成密钥：
```bash
# JWT_SECRET
openssl rand -base64 32

# SYSTEM_CONFIG_AES_KEY
openssl rand -hex 32
```

#### 7. 初始化数据库

```bash
npx prisma migrate deploy
npx prisma db seed
```

#### 8. 构建项目

```bash
npm run build
```

#### 9. 使用 PM2 启动

```bash
pm2 start npm --name "familycal" -- start
pm2 save
pm2 startup
```

#### 10. 配置 Nginx

创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/sites-available/familycal
```

添加以下内容：

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用站点并重启 Nginx：

```bash
sudo ln -s /etc/nginx/sites-available/familycal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 11. 配置 SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

#### 12. 常用维护命令

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs familycal

# 重启应用
pm2 restart familycal

# 停止应用
pm2 stop familycal

# 更新代码
cd /var/www/familycal
git pull
npm install
npm run build
pm2 restart familycal
```

---

## English

### Vercel Deployment (Recommended)

#### 1. Prerequisites

- GitHub account
- Vercel account (can sign in with GitHub)
- Fork this project to your GitHub

#### 2. Create Vercel Project

1. Visit [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Select your forked `familycal` repository
4. Framework Preset will auto-detect as Next.js
5. Click "Deploy" (first deployment will fail without env vars, this is expected)

#### 3. Add Postgres Database

1. Go to project settings
2. Click "Storage" tab
3. Click "Create Database"
4. Select "Postgres"
5. Choose region (select closest to your users)
6. Click "Create"

Vercel will automatically add these environment variables:
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_URL`

#### 4. Add Blob Storage

1. In "Storage" tab
2. Click "Create Store"
3. Select "Blob"
4. Click "Create"

Vercel will automatically add:
- `BLOB_READ_WRITE_TOKEN`

#### 5. Configure Environment Variables

1. Go to project settings
2. Click "Environment Variables" tab
3. Add the following:

**Required:**
```
JWT_SECRET=<generate with scripts/generate-keys.sh>
SYSTEM_CONFIG_AES_KEY=<generate with scripts/generate-keys.sh>
APP_URL=https://your-app.vercel.app
```

**Optional:**
```
OPENAI_API_KEY=<your OpenAI API Key>
ANTHROPIC_API_KEY=<your Anthropic API Key>
DEEPSEEK_API_KEY=<your DeepSeek API Key>
VAPID_PUBLIC_KEY=<generate with web-push>
VAPID_PRIVATE_KEY=<generate with web-push>
VAPID_SUBJECT=mailto:admin@example.com
```

Generate keys:
```bash
# Clone project locally
git clone https://github.com/yourusername/familycal.git
cd familycal

# Generate JWT and AES keys
bash scripts/generate-keys.sh

# Generate VAPID keys (optional)
npm install -g web-push
web-push generate-vapid-keys
```

#### 6. Redeploy

1. In Vercel Dashboard, click "Deployments" tab
2. Click three dots on latest deployment
3. Select "Redeploy"
4. Wait for deployment to complete

#### 7. Initialize Data

After successful deployment, database migrations run automatically. Visit your app URL:

- Default admin account: `admin`
- Default password: `admin123`

**⚠️ Change password immediately after first login!**

#### 8. Custom Domain (Optional)

1. In project settings, click "Domains"
2. Add your custom domain
3. Configure DNS as instructed
4. Update `APP_URL` environment variable to your custom domain

---

### VPS Server Deployment

#### 1. Server Requirements

- Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- At least 1GB RAM
- Node.js 18+
- Nginx (recommended)
- PM2 (process manager)

#### 2. Install Node.js

```bash
# Install Node.js 18 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### 3. Install PM2

```bash
sudo npm install -g pm2
```

#### 4. Clone Project

```bash
cd /var/www
sudo git clone https://github.com/deepinfan/familycal.git
cd familycal
sudo chown -R $USER:$USER .
```

#### 5. Install Dependencies

```bash
npm install
```

#### 6. Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

Edit `.env` file:

```env
DATABASE_URL="file:./prod.db"
JWT_SECRET="generate-a-strong-random-key"
SYSTEM_CONFIG_AES_KEY="generate-a-32-byte-key"
APP_URL="https://yourdomain.com"
```

Generate keys:
```bash
# JWT_SECRET
openssl rand -base64 32

# SYSTEM_CONFIG_AES_KEY
openssl rand -hex 32
```

#### 7. Initialize Database

```bash
npx prisma migrate deploy
npx prisma db seed
```

#### 8. Build Project

```bash
npm run build
```

#### 9. Start with PM2

```bash
pm2 start npm --name "familycal" -- start
pm2 save
pm2 startup
```

#### 10. Configure Nginx

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/familycal
```

Add the following:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/familycal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 11. Configure SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

#### 12. Maintenance Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs familycal

# Restart app
pm2 restart familycal

# Stop app
pm2 stop familycal

# Update code
cd /var/www/familycal
git pull
npm install
npm run build
pm2 restart familycal
```
