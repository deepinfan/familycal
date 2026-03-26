"use client";

import { useEffect, useState } from "react";

const messages = {
  zh: {
    title: "当前离线",
    message: "网络不可用。你仍可查看已缓存页面，恢复网络后数据会自动更新。"
  },
  en: {
    title: "Currently Offline",
    message: "Network unavailable. You can still view cached pages. Data will update automatically when network is restored."
  }
};

export default function OfflinePage() {
  const [language, setLanguage] = useState<"zh" | "en">("zh");

  useEffect(() => {
    const saved = localStorage.getItem("homecal_language");
    setLanguage(saved === "en" ? "en" : "zh");
  }, []);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ maxWidth: 420, textAlign: "center" }}>
        <h1>{messages[language].title}</h1>
        <p>{messages[language].message}</p>
      </section>
    </main>
  );
}
