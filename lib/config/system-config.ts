import { prisma } from "@/lib/prisma";
import { decryptText, encryptText } from "./crypto";

export async function getSystemConfig() {
  const items = await prisma.systemConfig.findMany();
  const map = new Map(items.map((item) => [item.key, item.value]));

  return {
    appTitleZh: map.get("app_title_zh") ?? "千千万万的家",
    appTitleEn: map.get("app_title_en") ?? "Homes Unfold",
    llmBaseUrl: map.get("llm_base_url") ?? "",
    llmModel: map.get("llm_model") ?? "",
    llmApiKeyEncrypted: map.get("llm_api_key_encrypted") ?? ""
  };
}

export async function upsertSystemConfig(key: string, value: string) {
  return prisma.systemConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

export async function setLlmApiKey(raw: string) {
  const encrypted = encryptText(raw);
  await upsertSystemConfig("llm_api_key_encrypted", encrypted);
}

export async function getDecryptedLlmApiKey(): Promise<string> {
  const item = await prisma.systemConfig.findUnique({ where: { key: "llm_api_key_encrypted" } });
  if (!item?.value) return "";
  try {
    return decryptText(item.value);
  } catch {
    return "";
  }
}
