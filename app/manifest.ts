import type { MetadataRoute } from "next";
import { getSystemConfig } from "@/lib/config/system-config";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await getSystemConfig();
  return {
    name: config.appTitleZh,
    short_name: config.appTitleZh,
    description: "家庭共享任务与日历应用",
    start_url: "/",
    display: "standalone",
    background_color: "#f0fdfa",
    theme_color: "#0f766e",
    lang: "zh-CN",
    icons: [
      {
        src: "/icon?size=192",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon?size=512",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml"
      },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml"
      }
    ]
  };
}
