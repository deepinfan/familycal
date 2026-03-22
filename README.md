# HomeCal - 家庭共享日历与任务管理系统

[English](#english) | [中文](#中文)

---

## 中文

### 📋 项目简介

HomeCal 是一个专为家庭设计的共享日历和任务管理 PWA 应用。支持多角色协作、双语界面、离线使用，并集成 AI 自然语言解析，让家庭任务管理变得简单高效。

### ✨ 核心特性

- 🏠 **多角色管理** - 为每个家庭成员创建独立角色，支持任务分配和权限管理
- 🌍 **双语支持** - 中文/英文界面自由切换，任务内容支持双语存储
- 🤖 **AI 任务解析** - 使用自然语言创建任务，如"明天下午3点妈妈去买菜"
- 📱 **PWA 离线支持** - 可安装到桌面，支持离线访问
- 📅 **灵活的日历视图** - 周视图和月视图，清晰展示任务安排
- 🔄 **任务重复** - 支持每日/每周/每月/每年重复任务
- 📄 **共享文档** - 支持 Markdown 格式文档，可添加图片和附件
- 🎨 **多主题** - 8种主题色可选（青绿、海蓝、玫红、石墨等）
- 🔐 **安全可靠** - JWT 认证、文件访问控制、数据加密

### 🛠️ 技术栈

**前端**
- Next.js 15 (App Router)
- React 19
- TypeScript
- React Markdown

**后端**
- Next.js API Routes
- Prisma ORM
- SQLite
- bcryptjs (密码加密)
- jose (JWT)

**AI 集成**
- 支持 OpenAI / Claude / DeepSeek API
- 自然语言任务解析

**PWA**
- next-pwa
- Service Worker
- 离线缓存

### 🚀 快速开始

#### 环境要求

- Node.js 18+

#### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/yourusername/familycal.git
cd familycal
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下变量：
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-here"
SYSTEM_CONFIG_AES_KEY="your-aes-key-here"
```

4. 初始化数据库
```bash
npx prisma migrate dev
npx prisma db seed
```

5. 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000

#### 默认管理员账号

- 角色：admin
- 密码：admin123

**⚠️ 首次登录后请立即修改密码！**

### 📖 使用指南

#### 管理员功能

1. **角色管理** - 添加家庭成员，设置初始密码
2. **系统配置** - 配置应用名称、LLM 服务
3. **模型服务** - 配置 OpenAI 兼容 API 用于任务解析

#### 普通用户功能

1. **创建任务** - 支持手动输入或 AI 自然语言解析
2. **查看日历** - 周视图/月视图切换
3. **管理文档** - 创建共享文档，上传附件
4. **个人设置** - 修改密码、切换语言和主题

### 🔒 安全特性

- HttpOnly Cookies 存储 JWT
- bcrypt 密码哈希
- AES-256-GCM 加密敏感配置
- 文件访问权限控制
- 输入验证（Zod）
- CSRF 保护（SameSite=Strict）
- 安全响应头配置

### 📦 部署

#### Vercel 部署

1. Fork 本仓库
2. 在 Vercel 导入项目
3. 配置环境变量
4. 部署

### 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 📄 开源协议

MIT License

---

## English

### 📋 Overview

HomeCal is a family-oriented shared calendar and task management PWA. It supports multi-role collaboration, bilingual interface, offline usage, and AI-powered natural language parsing for effortless family task management.

### ✨ Key Features

- 🏠 **Multi-Role Management** - Create individual roles for each family member with task assignment and permission control
- 🌍 **Bilingual Support** - Switch between Chinese/English interface, tasks support bilingual content
- 🤖 **AI Task Parsing** - Create tasks using natural language, e.g., "Mom buys groceries tomorrow at 3 PM"
- 📱 **PWA Offline Support** - Installable to desktop, works offline
- 📅 **Flexible Calendar Views** - Week and month views for clear task visualization
- 🔄 **Recurring Tasks** - Support daily/weekly/monthly/yearly repetition
- 📄 **Shared Documents** - Markdown-formatted documents with image and file attachments
- 🎨 **Multiple Themes** - 8 theme colors available (Teal, Ocean, Rose, Slate, etc.)
- 🔐 **Secure & Reliable** - JWT authentication, file access control, data encryption

### 🛠️ Tech Stack

**Frontend**
- Next.js 15 (App Router)
- React 19
- TypeScript
- React Markdown

**Backend**
- Next.js API Routes
- Prisma ORM
- SQLite
- bcryptjs (password hashing)
- jose (JWT)

**AI Integration**
- OpenAI / Claude / DeepSeek API support
- Natural language task parsing

**PWA**
- next-pwa
- Service Worker
- Offline caching

### 🚀 Quick Start

#### Requirements

- Node.js 18+

#### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/familycal.git
cd familycal
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
```

Edit `.env` file with the following variables:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key-here"
SYSTEM_CONFIG_AES_KEY="your-aes-key-here"
```

4. Initialize database
```bash
npx prisma migrate dev
npx prisma db seed
```

5. Start development server
```bash
npm run dev
```

Visit http://localhost:3000

#### Default Admin Account

- Role: admin
- Password: admin123

**⚠️ Change the password immediately after first login!**

### 📖 User Guide

#### Admin Features

1. **Role Management** - Add family members, set initial passwords
2. **System Configuration** - Configure app name, LLM service
3. **Model Service** - Configure OpenAI-compatible API for task parsing

#### User Features

1. **Create Tasks** - Manual input or AI natural language parsing
2. **View Calendar** - Switch between week/month views
3. **Manage Documents** - Create shared documents, upload attachments
4. **Personal Settings** - Change password, switch language and theme

### 🔒 Security Features

- HttpOnly Cookies for JWT storage
- bcrypt password hashing
- AES-256-GCM encryption for sensitive configs
- File access permission control
- Input validation (Zod)
- CSRF protection (SameSite=Strict)
- Security response headers

### 📦 Deployment

#### Vercel Deployment

1. Fork this repository
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### 🤝 Contributing

Issues and Pull Requests are welcome!

### 📄 License

MIT License

---

**Made with ❤️ for families**
