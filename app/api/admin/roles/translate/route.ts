import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { translateWithFallback } from "@/lib/translate";

const bodySchema = z.object({
  text: z.string().min(1),
  targetLang: z.enum(["zh", "en"])
});

export async function POST(request: NextRequest) {
  const authz = await requireAdmin(request);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 });
  }

  try {
    const translated = await translateWithFallback(parsed.data.text, parsed.data.targetLang);
    return NextResponse.json({ text: translated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "自动翻译失败" },
      { status: 502 }
    );
  }
}
