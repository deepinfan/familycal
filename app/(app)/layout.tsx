"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LanguageProvider, useLanguage } from "./language-context";

type User = {
  id: string;
  name: string;
  nameEn: string;
  isAdmin: boolean;
};

type AppTheme = "teal" | "ocean" | "rose" | "slate" | "amber" | "violet" | "mint" | "coral";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </LanguageProvider>
  );
}

function AppLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<AppTheme>("teal");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [settingsNote, setSettingsNote] = useState("");
  const [subscriptionKey, setSubscriptionKey] = useState("");
  const [loadingKey, setLoadingKey] = useState(false);
  const { language, setLanguage, appTitle, t } = useLanguage();
  const themeOptions: Array<{ value: AppTheme; label: string; className: string }> = [
    { value: "teal", label: t("themeTeal"), className: "theme-swatch--teal" },
    { value: "ocean", label: t("themeOcean"), className: "theme-swatch--ocean" },
    { value: "rose", label: t("themeRose"), className: "theme-swatch--rose" },
    { value: "slate", label: t("themeSlate"), className: "theme-swatch--slate" },
    { value: "amber", label: t("themeAmber"), className: "theme-swatch--amber" },
    { value: "violet", label: t("themeViolet"), className: "theme-swatch--violet" },
    { value: "mint", label: t("themeMint"), className: "theme-swatch--mint" },
    { value: "coral", label: t("themeCoral"), className: "theme-swatch--coral" }
  ];

  const navItems = [
    { href: "/", label: t("tasks") },
    { href: "/calendar", label: t("calendar") },
    { href: "/documents", label: t("documents") }
  ];

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("homecal_theme") as AppTheme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.dataset.theme = savedTheme;
    } else {
      document.documentElement.dataset.theme = "teal";
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth?mode=me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (user?.isAdmin && pathname !== "/admin") {
      router.replace("/admin");
    }
  }, [pathname, router, user]);

  useEffect(() => {
    async function registerPush() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      if (localStorage.getItem("homecal_push_prompted") === "1") return;

      localStorage.setItem("homecal_push_prompted", "1");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const keyRes = await fetch("/api/push/public-key");
      const keyJson = await keyRes.json().catch(() => ({}));
      const publicKey = keyJson.publicKey as string;
      if (!publicKey) return;

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const sub =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        }));

      const payload = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    registerPush().catch(() => null);
  }, []);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    localStorage.removeItem("homecal_push_prompted");
    router.replace("/login");
    router.refresh();
  }

  async function saveMyPassword() {
    setSettingsError("");
    setSettingsNote("");

    const res = await fetch("/api/auth", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSettingsError(json.error ?? "保存失败");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setSettingsNote(t("passwordUpdated"));
  }

  async function loadSubscriptionKey() {
    setLoadingKey(true);
    try {
      const res = await fetch("/api/calendar/subscription-key");
      if (res.ok) {
        const json = await res.json();
        setSubscriptionKey(json.key || "");
      }
    } finally {
      setLoadingKey(false);
    }
  }

  async function regenerateSubscriptionKey() {
    if (!confirm(t("regenerateConfirm"))) return;
    setLoadingKey(true);
    try {
      const res = await fetch("/api/calendar/subscription-key", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setSubscriptionKey(json.key || "");
        setSettingsNote("密钥已重新生成");
        setTimeout(() => setSettingsNote(""), 3000);
      }
    } finally {
      setLoadingKey(false);
    }
  }

  async function copySubscriptionLink() {
    const protocol = window.location.protocol === 'http:' && window.location.hostname === 'localhost' ? 'http:' : 'https:';
    const url = `${protocol}//${window.location.host}/api/calendar/${subscriptionKey}.ics`;
    await navigator.clipboard.writeText(url);
    setSettingsNote(t("linkCopied"));
    setTimeout(() => setSettingsNote(""), 3000);
  }

  useEffect(() => {
    if (settingsOpen && !subscriptionKey) {
      loadSubscriptionKey();
    }
  }, [settingsOpen]);

  function changeTheme(nextTheme: AppTheme) {
    setTheme(nextTheme);
    window.localStorage.setItem("homecal_theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  const userDisplayName = user ? (language === "en" && user.nameEn ? user.nameEn : user.name) : "";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__side">
          <div className="app-header__logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="app-header__logo-svg">
              <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
              <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17" />
              <path d="M8 13h3M13 13h3M8 17h3" />
            </svg>
          </div>
        </div>
        <div className="app-header__title">{appTitle}</div>
        <div className="app-header__actions">
          <button
            type="button"
            className="btn btn-ghost btn-user-trigger"
            onClick={() => {
              setSettingsOpen(true);
              setSettingsError("");
              setSettingsNote("");
            }}
            aria-label={t("settings")}
          >
            {userDisplayName}
          </button>
        </div>
      </header>

      <div className="page-wrap">{children}</div>

      {!user?.isAdmin ? (
        <nav className="app-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`app-nav__link${pathname === item.href ? " app-nav__link--active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}

      {settingsOpen ? (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <section className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="section-head modal-card__head">
              <div>
                <h2 className="headline">{t("userSettings")}</h2>
              </div>
              <button type="button" className="btn btn-danger modal-card__logout" onClick={logout}>
                {t("logoutAction")}
              </button>
            </div>

            <div className="section-grid modal-card__body">
              <label>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  {t("defaultLanguage")}
                </div>
                <div className="pill-row settings-language-row" role="radiogroup" aria-label={t("defaultLanguage")}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={language === "zh"}
                    className={`btn ${language === "zh" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setLanguage("zh")}
                  >
                    {t("languageZh")}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={language === "en"}
                    className={`btn ${language === "en" ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => setLanguage("en")}
                  >
                    {t("languageEn")}
                  </button>
                </div>
              </label>

              <label>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  {t("themeColor")}
                </div>
                <div className="theme-picker" role="radiogroup" aria-label={t("themeColor")}>
                  {themeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={theme === option.value}
                      aria-label={option.label}
                      title={option.label}
                      className={`theme-swatch ${option.className}${theme === option.value ? " theme-swatch--active" : ""}`}
                      onClick={() => changeTheme(option.value)}
                    />
                  ))}
                </div>
              </label>

              <label>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  {t("currentPassword")}
                </div>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </label>

              <label>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  {t("newPassword")}
                </div>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </label>

              <label>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  {t("calendarSync")}
                </div>
                <div style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
                  {t("calendarSyncDesc")}
                </div>
                {loadingKey ? (
                  <div className="inline-note">加载中...</div>
                ) : subscriptionKey ? (
                  <>
                    <input
                      type="text"
                      readOnly
                      value={`https://${window.location.host}/api/calendar/${subscriptionKey}.ics`}
                      style={{ marginBottom: "0.5rem" }}
                    />
                    <div className="btn-row" style={{ marginBottom: "0.5rem" }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={copySubscriptionLink}>
                        {t("copyLink")}
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={regenerateSubscriptionKey}>
                        {t("regenerateKey")}
                      </button>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: "1.6" }}>
                      {t("iphoneInstructions")}
                    </div>
                  </>
                ) : null}
              </label>

              {settingsError ? <div className="error-note">{settingsError}</div> : null}
              {settingsNote ? <div className="inline-note">{settingsNote}</div> : null}

              <div className="settings-footer modal-card__footer">
                <button type="button" className="btn btn-primary" onClick={saveMyPassword}>
                  {t("savePassword")}
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setSettingsOpen(false)}>
                  {t("close")}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
