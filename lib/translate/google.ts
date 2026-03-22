export async function googleTranslate(text: string, targetLang: "zh" | "en"): Promise<string> {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", targetLang);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const response = await fetch(url.toString(), {
    method: "GET"
  });

  if (!response.ok) {
    throw new Error(`Google Translate failed: ${response.status}`);
  }

  const data = await response.json();
  const translated = Array.isArray(data?.[0])
    ? data[0]
        .map((item: unknown) => (Array.isArray(item) && typeof item[0] === "string" ? item[0] : ""))
        .join("")
        .trim()
    : "";

  if (!translated) {
    throw new Error("Invalid translation response");
  }

  return translated;
}
