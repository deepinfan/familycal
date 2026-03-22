"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../language-context";

type Role = {
  id: string;
  name: string;
  nameEn: string;
  isAdmin: boolean;
};

type Config = {
  appTitleZh: string;
  appTitleEn: string;
  llmBaseUrl: string;
  llmModel: string;
  hasLlmApiKey: boolean;
};

type RoleDraft = {
  name: string;
  nameEn: string;
  password: string;
};

export default function AdminPage() {
  const { t } = useLanguage();
  const [roles, setRoles] = useState<Role[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [password, setPassword] = useState("");

  const [appTitleZh, setAppTitleZh] = useState("");
  const [appTitleEn, setAppTitleEn] = useState("");
  const [llmBaseUrl, setLlmBaseUrl] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");

  const [editingRoleId, setEditingRoleId] = useState("");
  const [editingDraft, setEditingDraft] = useState<RoleDraft | null>(null);
  const [passwordRoleId, setPasswordRoleId] = useState("");
  const [passwordDraft, setPasswordDraft] = useState("");
  const [deleteRoleId, setDeleteRoleId] = useState("");
  const [translatingCreate, setTranslatingCreate] = useState<"" | "zh" | "en">("");
  const [translatingEdit, setTranslatingEdit] = useState<"" | "zh" | "en">("");
  const [testingLlm, setTestingLlm] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [createManualEdited, setCreateManualEdited] = useState<Set<string>>(new Set());
  const [editManualEdited, setEditManualEdited] = useState<Set<string>>(new Set());
  const [appTitleManualEdited, setAppTitleManualEdited] = useState<Set<string>>(new Set());

  async function loadAll() {
    setError("");
    const [rolesRes, configRes] = await Promise.all([
      fetch("/api/admin/roles", { cache: "no-store" }),
      fetch("/api/admin/config", { cache: "no-store" })
    ]);

    const rolesJson = await rolesRes.json().catch(() => ({}));
    const configJson = await configRes.json().catch(() => ({}));

    if (!rolesRes.ok) {
      setError(rolesJson.error ?? "加载角色失败");
      return;
    }

    if (!configRes.ok) {
      setError(configJson.error ?? "加载系统配置失败");
      return;
    }

    setRoles(rolesJson.roles ?? []);
    setConfig(configJson);
    setAppTitleZh(configJson.appTitleZh ?? "");
    setAppTitleEn(configJson.appTitleEn ?? "");
    setLlmBaseUrl(configJson.llmBaseUrl ?? "");
    setLlmModel(configJson.llmModel ?? "");
  }

  useEffect(() => {
    loadAll();
  }, []);

  const adminCount = useMemo(() => roles.filter((role) => role.isAdmin).length, [roles]);

  async function handleAppTitleBlur(source: "zh" | "en") {
    try {
      if (source === "zh") {
        if (!appTitleZh.trim() || appTitleManualEdited.has("appTitleEn")) return;
        setTranslatingCreate("zh");
        const translated = await autoTranslate(appTitleZh, "en");
        if (translated) setAppTitleEn(translated);
      } else {
        if (!appTitleEn.trim() || appTitleManualEdited.has("appTitleZh")) return;
        setTranslatingCreate("en");
        const translated = await autoTranslate(appTitleEn, "zh");
        if (translated) setAppTitleZh(translated);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "自动翻译失败");
    } finally {
      setTranslatingCreate("");
    }
  }

  async function autoTranslate(text: string, targetLang: "zh" | "en") {
    if (!text.trim()) return "";

    const res = await fetch("/api/admin/roles/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), targetLang })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error ?? "自动翻译失败");
    }

    return String(json.text ?? "").trim();
  }

  async function handleCreateNameBlur(source: "zh" | "en") {
    try {
      if (source === "zh") {
        if (!name.trim() || createManualEdited.has("nameEn")) return;
        setTranslatingCreate("zh");
        const translated = await autoTranslate(name, "en");
        if (translated) setNameEn(translated);
      } else {
        if (!nameEn.trim() || createManualEdited.has("name")) return;
        setTranslatingCreate("en");
        const translated = await autoTranslate(nameEn, "zh");
        if (translated) setName(translated);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "自动翻译失败");
    } finally {
      setTranslatingCreate("");
    }
  }

  async function handleEditNameBlur(source: "zh" | "en") {
    if (!editingDraft) return;

    try {
      if (source === "zh") {
        if (!editingDraft.name.trim() || editManualEdited.has("nameEn")) return;
        setTranslatingEdit("zh");
        const translated = await autoTranslate(editingDraft.name, "en");
        if (translated) {
          setEditingDraft((prev) => (prev ? { ...prev, nameEn: translated } : prev));
        }
      } else {
        if (!editingDraft.nameEn.trim() || editManualEdited.has("name")) return;
        setTranslatingEdit("en");
        const translated = await autoTranslate(editingDraft.nameEn, "zh");
        if (translated) {
          setEditingDraft((prev) => (prev ? { ...prev, name: translated } : prev));
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "自动翻译失败");
    } finally {
      setTranslatingEdit("");
    }
  }

  async function createRole(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, nameEn, password })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "创建失败");
      return;
    }

    setName("");
    setNameEn("");
    setPassword("");
    await loadAll();
  }

  function startEditRole(role: Role) {
    setEditingRoleId(role.id);
    setEditingDraft({ name: role.name, nameEn: role.nameEn, password: "" });
    setPasswordRoleId("");
    setDeleteRoleId("");
  }

  async function saveRole(roleId: string) {
    if (!editingDraft) return;
    setError("");

    const payload: Record<string, string> = {
      name: editingDraft.name,
      nameEn: editingDraft.nameEn
    };

    const res = await fetch(`/api/admin/roles/${roleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "更新失败");
      return;
    }

    setEditingRoleId("");
    setEditingDraft(null);
    await loadAll();
  }

  async function savePassword(roleId: string) {
    setError("");

    const res = await fetch(`/api/admin/roles/${roleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordDraft })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "改密失败");
      return;
    }

    setPasswordRoleId("");
    setPasswordDraft("");
    await loadAll();
  }

  async function confirmDeleteRole(roleId: string) {
    setError("");

    const res = await fetch(`/api/admin/roles/${roleId}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "删除失败");
      return;
    }

    setDeleteRoleId("");
    await loadAll();
  }

  async function saveConfig() {
    setError("");
    setLlmTestResult("");

    if (!llmModel) {
      setError("请先测试配置并选择模型");
      return;
    }

    const payload: Record<string, string> = {
      llmBaseUrl: llmBaseUrl.trim(),
      llmModel: llmModel.trim()
    };

    if (llmApiKey.trim()) {
      payload.llmApiKey = llmApiKey.trim();
    }

    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "保存配置失败");
      return;
    }

    setConfig(json);
    setLlmApiKey("");
    setAvailableModels([]);
    setLlmTestResult("✅ 配置已保存");
    window.dispatchEvent(
      new CustomEvent("homecal-config-updated", {
        detail: {
          appTitleZh: json.appTitleZh,
          appTitleEn: json.appTitleEn
        }
      })
    );
  }

  async function testLlmConfig() {
    setTestingLlm(true);
    setLlmTestResult("");
    setError("");
    setAvailableModels([]);

    const res = await fetch("/api/admin/test-llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        llmBaseUrl: llmBaseUrl.trim(),
        llmApiKey: llmApiKey.trim()
      })
    });

    const json = await res.json().catch(() => ({}));
    setTestingLlm(false);

    if (!res.ok) {
      setLlmTestResult(`❌ ${json.error ?? "测试失败"}`);
      return;
    }

    setLlmTestResult(`✅ ${json.message ?? "测试成功"}`);
    if (json.models && Array.isArray(json.models)) {
      setAvailableModels(json.models);
    }
  }

  async function saveAppTitle(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appTitleZh: appTitleZh.trim(),
        appTitleEn: appTitleEn.trim()
      })
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "保存配置失败");
      return;
    }

    setConfig(json);
    window.dispatchEvent(
      new CustomEvent("homecal-config-updated", {
        detail: {
          appTitleZh: json.appTitleZh ?? appTitleZh.trim(),
          appTitleEn: json.appTitleEn ?? appTitleEn.trim()
        }
      })
    );
  }

  return (
    <main className="section-grid">
      {error ? <div className="error-note">{error}</div> : null}

      <section className="section-grid">
        <section className="panel">
          <div className="section-head">
            <div>
              <h2 className="headline">{t("appTitleConfig")}</h2>
            </div>
          </div>

          <form onSubmit={saveAppTitle} className="section-grid">
            <div className="grid-cards grid-cards--2">
              <label>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  {t("appTitleZh")}
                </div>
                <input
                  required
                  value={appTitleZh}
                  onChange={(e) => {
                    setAppTitleZh(e.target.value);
                    setAppTitleManualEdited(prev => new Set(prev).add("appTitleZh"));
                  }}
                  onBlur={() => handleAppTitleBlur("zh")}
                  placeholder="千千万万的家"
                />
              </label>

              <label>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  {t("appTitleEn")}
                </div>
                <input
                  required
                  value={appTitleEn}
                  onChange={(e) => {
                    setAppTitleEn(e.target.value);
                    setAppTitleManualEdited(prev => new Set(prev).add("appTitleEn"));
                  }}
                  onBlur={() => handleAppTitleBlur("en")}
                  placeholder="Homes Unfold"
                />
              </label>
            </div>

            {translatingCreate ? <div className="inline-note">自动翻译中...</div> : null}

            <div className="btn-row">
              <button type="submit" className="btn btn-accent">
                保存
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="section-head">
            <div>
              <h2 className="headline">{t("modelServiceConfig")}</h2>
            </div>
          </div>

          <div className="section-grid">
            <label>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                {t("openaiApiUrl")}
              </div>
              <input
                required
                value={llmBaseUrl}
                onChange={(e) => {
                  setLlmBaseUrl(e.target.value);
                  setAvailableModels([]);
                  setLlmModel("");
                }}
                placeholder="https://api.openai.com/v1"
              />
            </label>

            <label>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                {t("apiKeyKeepEmpty")}
              </div>
              <input
                type="password"
                value={llmApiKey}
                onChange={(e) => {
                  setLlmApiKey(e.target.value);
                  setAvailableModels([]);
                  setLlmModel("");
                }}
                placeholder={config?.hasLlmApiKey ? t("apiKeyConfigured") : t("apiKeyInput")}
              />
            </label>

            <div className="inline-note">
              {t("currentKeyStatus")}：{config?.hasLlmApiKey ? t("configured") : t("notConfigured")}
            </div>

            {availableModels.length > 0 && (
              <div>
                <div className="eyebrow" style={{ marginBottom: 8 }}>可用模型（点击选择）</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {availableModels.map((model) => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => setLlmModel(model)}
                      className={`pill ${llmModel === model ? "pill--active" : ""}`}
                      style={{ cursor: "pointer" }}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {llmTestResult && (
              <div className="inline-note" style={{ color: llmTestResult.startsWith("✅") ? "#16a34a" : "#dc2626" }}>
                {llmTestResult}
              </div>
            )}

            <div className="btn-row">
              <button
                type="button"
                onClick={availableModels.length > 0 && llmModel ? saveConfig : testLlmConfig}
                disabled={testingLlm}
                className="btn btn-accent"
              >
                {testingLlm ? "测试中..." : (availableModels.length > 0 && llmModel ? "保存" : "测试")}
              </button>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <div>
              <h2 className="headline">{t("createRole")}</h2>
            </div>
            <span className="pill">{t("adminCount")} {adminCount}{t("peopleSuffix")}</span>
          </div>
          <form onSubmit={createRole} className="section-grid">
            <div className="grid-cards grid-cards--2">
              <input
                required
                placeholder="中文名"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setCreateManualEdited(prev => new Set(prev).add("name"));
                }}
                onBlur={() => handleCreateNameBlur("zh")}
              />
              <input
                required
                placeholder="English Name"
                value={nameEn}
                onChange={(e) => {
                  setNameEn(e.target.value);
                  setCreateManualEdited(prev => new Set(prev).add("nameEn"));
                }}
                onBlur={() => handleCreateNameBlur("en")}
              />
            </div>
            {translatingCreate ? <div className="inline-note">自动翻译中...</div> : null}
            <input required type="password" placeholder={t("initialPasswordPlaceholder")} value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="btn-row">
              <button type="submit" className="btn btn-accent">
                {t("add")}
              </button>
            </div>
          </form>
        </section>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h2 className="headline">{t("roles")}</h2>
          </div>
        </div>

        <div className="plain-list">
          {roles.map((role) => {
            const isEditing = editingRoleId === role.id && editingDraft;
            const isPasswordEditing = passwordRoleId === role.id;
            const isDeleteConfirming = deleteRoleId === role.id;

            return (
              <article key={role.id} className="doc-card stack-card">
                <div className="stack-row">
                  <div>
                    <div className="task-card__title">
                      {role.name}{role.nameEn ? ` / ${role.nameEn}` : ""} {role.isAdmin ? "[admin]" : ""}
                    </div>
                    <div className="task-card__meta">{role.isAdmin ? t("adminRolePasswordOnlyHint") : t("roleInlineEditHint")}</div>
                  </div>
                  <div className="btn-row">
                    {!role.isAdmin ? (
                      <button onClick={() => startEditRole(role)} className="btn btn-ghost" type="button">
                        {t("edit")}
                      </button>
                    ) : null}
                    <button
                      onClick={() => {
                        setPasswordRoleId(isPasswordEditing ? "" : role.id);
                        setDeleteRoleId("");
                        setEditingRoleId("");
                        setEditingDraft(null);
                      }}
                      className="btn btn-ghost"
                      type="button"
                    >
                      {t("changePassword")}
                    </button>
                    {!role.isAdmin ? (
                      <button
                        onClick={() => {
                          setDeleteRoleId(isDeleteConfirming ? "" : role.id);
                          setPasswordRoleId("");
                        }}
                        className="btn btn-danger"
                        type="button"
                      >
                        {t("delete")}
                      </button>
                    ) : null}
                  </div>
                </div>

                {isEditing ? (
                  <div className="inline-form">
                    <div className="grid-cards grid-cards--2">
                      <input
                        value={editingDraft.name}
                        onChange={(e) => {
                          setEditingDraft({ ...editingDraft, name: e.target.value });
                          setEditManualEdited(prev => new Set(prev).add("name"));
                        }}
                        placeholder="中文名"
                        onBlur={() => handleEditNameBlur("zh")}
                      />
                      <input
                        value={editingDraft.nameEn}
                        onChange={(e) => {
                          setEditingDraft({ ...editingDraft, nameEn: e.target.value });
                          setEditManualEdited(prev => new Set(prev).add("nameEn"));
                        }}
                        placeholder="English Name"
                        onBlur={() => handleEditNameBlur("en")}
                      />
                    </div>
                    {translatingEdit ? <div className="inline-note">自动翻译中...</div> : null}
                    <div className="btn-row">
                      <button type="button" className="btn btn-primary" onClick={() => saveRole(role.id)}>
                        {t("save")}
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => {
                        setEditingRoleId("");
                        setEditingDraft(null);
                      }}>
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                ) : null}

                {isPasswordEditing ? (
                  <div className="inline-form">
                    <input
                      type="password"
                      value={passwordDraft}
                      onChange={(e) => setPasswordDraft(e.target.value)}
                      placeholder={t("newPasswordFor", { name: role.name })}
                    />
                    <div className="btn-row">
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={passwordDraft.trim().length < 6}
                        onClick={() => savePassword(role.id)}
                      >
                        {t("saveNewPassword")}
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => {
                        setPasswordRoleId("");
                        setPasswordDraft("");
                      }}>
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                ) : null}

                {isDeleteConfirming ? (
                  <div className="inline-form inline-form--danger">
                    <div className="task-card__meta">{t("deleteRoleConfirm", { name: role.name })}</div>
                    <div className="btn-row">
                      <button type="button" className="btn btn-danger" onClick={() => confirmDeleteRole(role.id)}>
                        {t("confirmDelete")}
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => setDeleteRoleId("")}>
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
