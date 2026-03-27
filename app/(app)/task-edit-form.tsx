"use client";

import { translateTaskType } from "./language-context";

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
  language: "zh" | "en";
  t: (key: any) => string;
  roles: Role[];
  eventTypes: string[];
  repeatOptions: readonly RepeatOption[];
  titleZh: string;
  titleEn: string;
  datetime: string;
  type: string;
  repeatCycle: RepeatCycle;
  repeatUntil: string;
  assigneeRoleIds: string[];
  deleting?: boolean;
  deletingRecurring?: boolean;
  saving?: boolean;
  setTitleZh: (value: string) => void;
  setTitleEn: (value: string) => void;
  setDatetime: (value: string) => void;
  setType: (value: string) => void;
  setRepeatCycle: (value: RepeatCycle) => void;
  setRepeatUntil: (value: string) => void;
  onToggleAssignee: (roleId: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  onDeleteRecurring?: () => void;
};

export function TaskEditForm({
  language,
  t,
  roles,
  eventTypes,
  repeatOptions,
  titleZh,
  titleEn,
  datetime,
  type,
  repeatCycle,
  repeatUntil,
  assigneeRoleIds,
  deleting = false,
  deletingRecurring = false,
  saving = false,
  setTitleZh,
  setTitleEn,
  setDatetime,
  setType,
  setRepeatCycle,
  setRepeatUntil,
  onToggleAssignee,
  onSave,
  onCancel,
  onDelete,
  onDeleteRecurring
}: Props) {
  return (
    <div className="inline-form">
      <div>
        <label className="eyebrow" style={{ marginBottom: 8 }}>
          {t("taskContent")}
        </label>
        <input
          value={language === "zh" ? titleZh : titleEn}
          onChange={(e) => {
            if (language === "zh") setTitleZh(e.target.value);
            else setTitleEn(e.target.value);
          }}
          placeholder={t("taskContent")}
        />
      </div>

      <div className="grid-cards grid-cards--2">
        <input value={datetime} onChange={(e) => setDatetime(e.target.value)} type="datetime-local" />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {eventTypes.map((option) => (
            <option key={option} value={option}>
              {translateTaskType(option, language)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid-cards grid-cards--2">
        <select value={repeatCycle} onChange={(e) => setRepeatCycle(e.target.value as RepeatCycle)}>
          {repeatOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {repeatCycle !== "none" ? (
        <div className="grid-cards grid-cards--2">
          <input
            value={repeatUntil}
            onChange={(e) => setRepeatUntil(e.target.value)}
            type="date"
            placeholder={t("repeatUntil")}
          />
        </div>
      ) : null}

      <div className="pill-row">
        {roles.map((role) => (
          <label key={role.id} className={`role-chip${assigneeRoleIds.includes(role.id) ? " role-chip--selected" : ""}`}>
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

      <div className="btn-row">
        <button type="button" className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
          {saving ? t("saving") : t("saveChanges")}
        </button>
        {onDelete ? (
          <button type="button" className="btn btn-danger btn-sm" onClick={onDelete} disabled={deleting}>
            {deleting ? t("deleting") : t("delete")}
          </button>
        ) : null}
        {onDeleteRecurring && repeatCycle !== "none" ? (
          <button type="button" className="btn btn-danger btn-sm" onClick={onDeleteRecurring} disabled={deletingRecurring}>
            {deletingRecurring ? (language === "zh" ? "删除中..." : "Deleting...") : (language === "zh" ? "删除周期任务" : "Delete Recurring")}
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
