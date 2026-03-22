import type { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";

export async function requireAdmin(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return { ok: false as const, status: 401, error: "未登录" };
  if (!auth.isAdmin) return { ok: false as const, status: 403, error: "仅管理员可访问" };
  return { ok: true as const, auth };
}
