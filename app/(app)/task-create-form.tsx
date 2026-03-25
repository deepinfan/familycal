"use client";

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
  t: (key: any) => string;
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
  onSubmit: () => void;
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

      <div className="btn-row">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={creating}>
          {cancelLabel}
        </button>
        <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={creating}>
          {creating ? (t("creatingTask") || "创建中...") : submitLabel}
        </button>
      </div>
    </div>
  );
}
