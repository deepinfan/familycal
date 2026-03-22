import { getDecryptedLlmApiKey, getSystemConfig } from "@/lib/config/system-config";
import { googleTranslate } from "./google";

export async function translateWithFallback(text: string, targetLang: "zh" | "en"): Promise<string> {
  try {
    return await googleTranslate(text, targetLang);
  } catch (googleError) {
    try {
      return await translateWithLlm(text, targetLang);
    } catch (llmError) {
      throw new Error(
        [
          formatCause("Google Translate", googleError),
          formatCause("LLM", llmError)
        ].join("；")
      );
    }
  }
}

async function translateWithLlm(text: string, targetLang: "zh" | "en"): Promise<string> {
  const [config, apiKey] = await Promise.all([getSystemConfig(), getDecryptedLlmApiKey()]);
  if (!config.llmBaseUrl || !config.llmModel || !apiKey) {
    throw new Error("LLM translation config missing");
  }

  const targetLabel = targetLang === "zh" ? "简体中文" : "English";
  const baseUrl = config.llmBaseUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.llmModel,
      messages: [
        {
          role: "user",
          content: [
            `Translate the following role name into ${targetLabel}.`,
            "Return only the translated text with no explanation.",
            `Input: ${text}`
          ].join("\n")
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`LLM translation failed: ${response.status}${errorText ? ` ${errorText.slice(0, 180)}` : ""}`);
  }

  const data = await response.json();
  const rawContent = data?.choices?.[0]?.message?.content;
  const content =
    typeof rawContent === "string"
      ? rawContent.trim()
      : Array.isArray(rawContent)
        ? rawContent
            .map((item) => (typeof item?.text === "string" ? item.text : typeof item === "string" ? item : ""))
            .join("")
            .trim()
        : "";
  if (!content) {
    throw new Error("Empty LLM translation");
  }

  return content;
}

function formatCause(label: string, error: unknown) {
  if (error instanceof Error && error.message) {
    return `${label}失败: ${error.message}`;
  }
  return `${label}失败`;
}
