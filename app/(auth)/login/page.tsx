"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Role = {
  id: string;
  name: string;
  nameEn: string;
  isAdmin: boolean;
};

const messages = {
  zh: {
    chooseRole: "选择角色后输入密码",
    passwordOf: "{name} 的密码",
    passwordPlaceholder: "输入密码",
    remember30d: "保持登录 30 天",
    loadingRoles: "加载角色失败",
    loginFailed: "登录失败",
    loginBusy: "登录中...",
    login: "登录",
    networkError: "网络异常，请重试"
  },
  en: {
    chooseRole: "Choose a role and enter password",
    passwordOf: "{name}'s password",
    passwordPlaceholder: "Enter password",
    remember30d: "Keep login for 30 days",
    loadingRoles: "Failed to load roles",
    loginFailed: "Login failed",
    loginBusy: "Signing in...",
    login: "Login",
    networkError: "Network error, please retry"
  }
} as const;

export default function LoginPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [language, setLanguage] = useState<"zh" | "en">("zh");
  const [appTitleZh, setAppTitleZh] = useState<string>("千千万万的家");
  const [appTitleEn, setAppTitleEn] = useState<string>("Homes Unfold");
  const [roleId, setRoleId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedRoleId = localStorage.getItem("homecal_last_role_id");
    if (savedRoleId) setRoleId(savedRoleId);

    const savedLanguage = localStorage.getItem("homecal_language");
    if (savedLanguage === "zh" || savedLanguage === "en") {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth")
      .then((res) => res.json())
      .then((data) => {
        setRoles(data.roles ?? []);
      })
      .catch(() => setError(messages[language].loadingRoles));
  }, [language]);

  useEffect(() => {
    function loadConfig() {
      fetch("/api/public/config", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.appTitleZh) setAppTitleZh(String(data.appTitleZh));
          if (data?.appTitleEn) setAppTitleEn(String(data.appTitleEn));
        })
        .catch(() => null);
    }

    function handleConfigUpdated(event: Event) {
      const detail = (event as CustomEvent<{ appTitleZh?: string; appTitleEn?: string }>).detail;
      if (detail?.appTitleZh) setAppTitleZh(detail.appTitleZh);
      if (detail?.appTitleEn) setAppTitleEn(detail.appTitleEn);
    }

    loadConfig();
    window.addEventListener("homecal-config-updated", handleConfigUpdated as EventListener);
    return () => window.removeEventListener("homecal-config-updated", handleConfigUpdated as EventListener);
  }, []);

  const selectedRole = useMemo(() => roles.find((r) => r.id === roleId), [roles, roleId]);
  const text = messages[language];
  const roleLabel = (role: Role) => (language === "en" && role.nameEn ? role.nameEn : role.name);
  const appTitle = language === "en" && appTitleEn ? appTitleEn : appTitleZh;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, password, remember })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? text.loginFailed);
        setLoading(false);
        return;
      }

      const data = await res.json().catch(() => ({}));
      localStorage.setItem("homecal_last_role_id", roleId);
      localStorage.setItem("homecal_language", language);
      router.replace(data.user?.isAdmin ? "/admin" : "/");
      router.refresh();
    } catch {
      setError(text.networkError);
      setLoading(false);
    }
  }

  return (
    <main className="app-shell app-shell--auth login-stage">
      <div className="login-backdrop" />
      <section className="panel login-panel">
        <div className="login-title-block">
          <h1 className="headline login-title">{appTitle}</h1>
        </div>

        <div className="pill-row login-language-row">
          <button
            type="button"
            className={`btn ${language === "zh" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setLanguage("zh")}
          >
            中文
          </button>
          <button
            type="button"
            className={`btn ${language === "en" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setLanguage("en")}
          >
            English
          </button>
        </div>

        <div className="choice-grid login-choice-grid">
          {roles.map((role) => {
            const active = role.id === roleId;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setRoleId(role.id)}
                className={`choice-card${active ? " choice-card--active" : ""}`}
              >
                <div className="login-role-name">{roleLabel(role)}</div>
              </button>
            );
          })}
        </div>

        <form onSubmit={onSubmit} className="section-grid" style={{ gap: "0.9rem", marginTop: "1rem" }}>
          <div>
            <label htmlFor="password" className="eyebrow" style={{ marginBottom: 8 }}>
              {selectedRole ? text.passwordOf.replace("{name}", roleLabel(selectedRole)) : text.passwordPlaceholder}
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={text.passwordPlaceholder}
            />
          </div>

          {error ? <p className="error-note" style={{ margin: 0 }}>{error}</p> : null}

          <div className="login-submit-row">
            <label className="pill login-remember-pill">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ width: 16, height: 16, padding: 0, margin: 0 }}
              />
              {text.remember30d}
            </label>
            <button type="submit" disabled={loading || !roleId} className="btn btn-accent">
              {loading ? text.loginBusy : text.login}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
