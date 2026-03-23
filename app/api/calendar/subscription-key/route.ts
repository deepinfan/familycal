import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateSubscriptionKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "";
  for (let i = 0; i < 8; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let role = await prisma.role.findUnique({
    where: { id: auth.roleId },
    select: { calendarSubscriptionKey: true }
  });

  if (!role?.calendarSubscriptionKey) {
    const key = generateSubscriptionKey();
    await prisma.role.update({
      where: { id: auth.roleId },
      data: { calendarSubscriptionKey: key }
    });
    return NextResponse.json({ key });
  }

  return NextResponse.json({ key: role.calendarSubscriptionKey });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const key = generateSubscriptionKey();
  await prisma.role.update({
    where: { id: auth.roleId },
    data: { calendarSubscriptionKey: key }
  });

  return NextResponse.json({ key });
}
