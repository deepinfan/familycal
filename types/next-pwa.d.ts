declare module "next-pwa" {
  import type { NextConfig } from "next";

  type PwaConfig = {
    dest: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    fallbacks?: {
      document?: string;
    };
    runtimeCaching?: Array<Record<string, unknown>>;
  };

  export default function withPWA(config: PwaConfig): (nextConfig: NextConfig) => NextConfig;
}
