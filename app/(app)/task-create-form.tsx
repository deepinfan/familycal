"use client";

import { useState } from "react";

type Role = {
  id: string;
  name: string;
};

type RepeatCycle = "none" | "daily" | "weekly" | "monthly" | "yearly";

type RepeatOption = {
  value: RepeatCycle;
  label: string;
};

type Props = {
  t: (key: any, vars?: Record<string, string | number>) => string;
  roles: Role[];
  repeatOptions: readonly RepeatOption[];
  titleZh: string;
  manualDate: string;
  manualTime: string;
  repeatCycle: RepeatCycle;
  repeatUntil: string;
  assigneeRoleIds: string[];
  plain?: boolean;
  creating?: boolean;
  cancelLabel: string;
  submitLabel: string;
  setTitleZh: (value: string) => void;
  setManualDate: (value: string) => void;
  setManualTime: (value: string) => void;
  setRepeatCycle: (value: RepeatCycle) => void;
  setRepeatUntil: (value: string) => void;
  onToggleAssignee: (roleId: string) => void;
  onCancel: () => void;
  onSubmit: (uploadedFiles: Array<{
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
  }>) => void;
  onEnableRepeat: () => void;
  onDisableRepeat: () => void;
};

export function TaskCreateForm({
  t,
  roles,
  repeatOptions,
  titleZh,
  manualDate,
  manualTime,
  repeatCycle,
  repeatUntil,
  assigneeRoleIds,
  plain,
  creating = false,
  cancelLabel,
  submitLabel,
  setTitleZh,
  setManualDate,
  setManualTime,
  setRepeatCycle,
  setRepeatUntil,
  onToggleAssignee,
  onCancel,
  onSubmit,
  onEnableRepeat,
  onDisableRepeat
}: Props) {
  const showRepeat = repeatCycle !== "none";
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
  }>>([]);
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        if (!res.ok) throw new Error(t("uploadFailed", { filename: file.name }));
        return res.json();
      });
      const results = await Promise.all(uploadPromises);
      setUploadedFiles((prev) => [...prev, ...results]);
      e.target.value = '';
    } catch (err) {
      console.error(err);
      e.target.value = '';
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`inline-form${plain ? " inline-form--plain" : ""}`}>
      <div>
        <label className="eyebrow" style={{ marginBottom: 8 }}>
          {t("setTaskTime")}
        </label>
        <div className="manual-datetime-row">
          <input
            className="manual-date-input"
            value={manualDate}
            onChange={(e) => setManualDate(e.target.value)}
            type="date"
            required
          />
          <input
            className="manual-time-input"
            value={manualTime}
            onChange={(e) => setManualTime(e.target.value)}
            type="time"
            step={900}
            required
          />
        </div>
      </div>

      {showRepeat ? (
        <div className="repeat-inline-row">
          <div>
            <label className="eyebrow" style={{ marginBottom: 8 }}>
              {t("repeatCycle")}
            </label>
            <select
              value={repeatCycle}
              onChange={(e) => {
                const nextValue = e.target.value as RepeatCycle;
                setRepeatCycle(nextValue);
                if (nextValue !== "none" && !repeatUntil) {
                  setRepeatUntil(new Date().toISOString().slice(0, 10));
                }
              }}
            >
              {repeatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="eyebrow" style={{ marginBottom: 8 }}>
              {t("repeatUntil")}
            </label>
            <input
              value={repeatUntil}
              onChange={(e) => setRepeatUntil(e.target.value)}
              type="date"
            />
          </div>
        </div>
      ) : null}

      <div>
        <div className="manual-content-head">
          <label className="eyebrow" style={{ marginBottom: 0 }}>
            {t("taskContent")}
          </label>
          <label className={`pill pill--compact manual-repeat-toggle${showRepeat ? " pill--active" : ""}`}>
            <input
              type="checkbox"
              checked={showRepeat}
              onChange={(e) => {
                if (e.target.checked) onEnableRepeat();
                else onDisableRepeat();
              }}
              style={{ width: 16, height: 16, padding: 0, margin: 0 }}
            />
            {t("repeatEnabled")}
          </label>
        </div>
        <input value={titleZh} onChange={(e) => setTitleZh(e.target.value)} required placeholder={t("titleZhPlaceholder")} />
      </div>

      <div>
        <label className="eyebrow" style={{ marginBottom: 8 }}>
          {t("taskAssignee")}
        </label>
        <div className="pill-row">
          {roles.map((role) => (
            <label
              key={role.id}
              className={`role-chip${assigneeRoleIds.includes(role.id) ? " role-chip--selected" : ""}`}
            >
              <input
                type="checkbox"
                checked={assigneeRoleIds.includes(role.id)}
                onChange={() => onToggleAssignee(role.id)}
                style={{ width: 16, height: 16, padding: 0, margin: 0 }}
              />
              <span>{role.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="eyebrow" style={{ marginBottom: 8 }}>
          {t("attachments")}
        </label>
        <input
          type="file"
          multiple
          onChange={handleFileUpload}
          disabled={uploading}
          accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        />
        <div className="inline-note" style={{ marginTop: "0.25rem", fontSize: "0.85rem" }}>
          {t("supportedFileTypes")}
        </div>
        {uploading ? <p className="inline-note">{t("uploading")}</p> : null}
        {uploadedFiles.length > 0 ? (
          <div style={{ marginTop: "0.5rem" }}>
            {uploadedFiles.map((file, index) => (
              <div key={index} style={{ fontSize: "0.9rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                <span>📎 {file.filename} ({(file.size / 1024).toFixed(1)} KB)</span>
                <button
                  type="button"
                  onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== index))}
                  style={{ color: "var(--danger)", cursor: "pointer", background: "none", border: "none", padding: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={creating}>
          {cancelLabel}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => {
          onSubmit(uploadedFiles);
          setUploadedFiles([]);
        }} disabled={creating}>
          {creating ? t("creatingTask") : submitLabel}
        </button>
      </div>
    </div>
  );
}
