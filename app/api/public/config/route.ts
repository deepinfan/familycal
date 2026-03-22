import { NextResponse } from "next/server";
import { getSystemConfig } from "@/lib/config/system-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getSystemConfig();
  return NextResponse.json({
    appTitleZh: config.appTitleZh,
    appTitleEn: config.appTitleEn
  });
}
