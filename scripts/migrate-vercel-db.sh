#!/bin/bash

# Vercel Postgres 数据库迁移脚本

echo "请从 Vercel Dashboard 复制 POSTGRES_URL_NON_POOLING 的值"
echo "位置: Storage → Postgres → .env.local 标签"
echo ""
read -p "请粘贴 POSTGRES_URL_NON_POOLING: " POSTGRES_URL

if [ -z "$POSTGRES_URL" ]; then
  echo "错误: 未提供数据库连接字符串"
  exit 1
fi

export POSTGRES_URL_NON_POOLING="$POSTGRES_URL"
export POSTGRES_PRISMA_URL="$POSTGRES_URL"

echo ""
echo "正在生成数据库迁移文件..."
npx prisma migrate dev --name init_postgres

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 数据库迁移完成！正在初始化数据..."
  npx prisma db seed

  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 数据库初始化完成！"
    echo "默认管理员账号: admin"
    echo "默认密码: admin123"
  else
    echo "❌ 数据初始化失败"
    exit 1
  fi
else
  echo "❌ 数据库迁移失败"
  exit 1
fi
