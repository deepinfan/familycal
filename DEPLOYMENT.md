# 部署指南 | Deployment Guide

[中文](#中文) | [English](#english)

---

## 中文

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
