import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { getSystemConfig } from "@/lib/config/system-config";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSystemConfig();
  return {
    title: config.appTitleZh,
    description: "家庭共享任务与日历应用",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: config.appTitleZh
    },
    icons: {
      apple: "/apple-icon"
    }
  };
}

export const viewport: Viewport = {
  themeColor: "#0f766e"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
