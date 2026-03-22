import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME, getAuthCookieOptions, isSecureRequest, signToken, verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  roleId: z.string().min(1),
  password: z.string().min(1),
  remember: z.boolean().optional().default(false)
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6)
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");

  if (mode === "me") {
    const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
    const auth = token ? await verifyToken(token) : null;
    if (!auth) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const role = await prisma.role.findUnique({
      where: { id: auth.roleId },
      select: { id: true, name: true, nameEn: true, isAdmin: true }
    });

    if (!role) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user: role });
  }

  const roles = await prisma.role.findMany({
    select: { id: true, name: true, nameEn: true, isAdmin: true },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ roles });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }

  const { roleId, password, remember } = parsed.data;

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    return NextResponse.json({ error: "角色或密码错误" }, { status: 401 });
  }

  const matched = await bcrypt.compare(password, role.passwordHash);
  if (!matched) {
    return NextResponse.json({ error: "角色或密码错误" }, { status: 401 });
  }

  const token = await signToken({ roleId: role.id, isAdmin: role.isAdmin }, remember);

  const response = NextResponse.json({
    user: {
      id: role.id,
      name: role.name,
      nameEn: role.nameEn,
      isAdmin: role.isAdmin
    }
  });

  response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions(remember, isSecureRequest(request)));
  return response;
}

export async function PATCH(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const auth = token ? await verifyToken(token) : null;
  if (!auth) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }

  const role = await prisma.role.findUnique({
    where: { id: auth.roleId },
    select: { id: true, passwordHash: true }
  });
  if (!role) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  const matched = await bcrypt.compare(parsed.data.currentPassword, role.passwordHash);
  if (!matched) {
    return NextResponse.json({ error: "当前密码错误" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.role.update({
    where: { id: role.id },
    data: { passwordHash }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "strict",
    path: "/",
    maxAge: 0
  });
  return response;
}
