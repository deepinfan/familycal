"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { translateStatus, translateTaskType, useLanguage } from "./language-context";
import { useEvents } from "./events-context";
import { TaskCreateForm } from "./task-create-form";
import { TaskEditForm } from "./task-edit-form";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Download from "yet-another-react-lightbox/plugins/download";
import "yet-another-react-lightbox/styles.css";

type Role = {
  id: string;
  name: string;
  nameEn: string;
};

type EventItem = {
  id: string;
  titleZh: string;
  titleEn: string;
  datetime: string;
  type: string;
  repeatCycle: "none" | "daily" | "weekly" | "monthly" | "yearly";
  repeatUntil: string | null;
  status: "pending" | "done" | "cancelled";
  creator: Role;
  issuedBy: Role;
  assignees: Role[];
  isSaving?: boolean;
  attachments?: Array<{
    id: string;
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
    thumbnail?: string;
  }>;
};

type EventsResponse = {
  currentRoleId: string;
  roles: Role[];
  events: EventItem[];
};

const EVENT_TYPES = ["学习", "玩耍", "家务", "购物", "其他"];

function formatDatetime(value: string, language: "zh" | "en") {
  const date = new Date(value);
  const dateStr = date.toLocaleString(language === "zh" ? "zh-CN" : "en-US", { hour12: false });
  const weekday = date.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", { weekday: "short" });
  return `${dateStr} ${weekday}`;
}

function toLocalDatetimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function getNowDatetimeInput() {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function displayRoleName(role: Role, language: "zh" | "en") {
  if (language === "en" && role.nameEn?.trim()) return role.nameEn;
  return role.name;
}

function splitLocalDatetime(value: string) {
  if (!value) {
    return { date: "", time: "" };
  }
  const [date, time = ""] = value.split("T");
  return { date, time: time.slice(0, 5) };
}

function combineDateAndTime(date: string, time: string) {
  return `${date}T${time}`;
}

function getDefaultManualDateTime() {
  const now = new Date();
  const minutes = Math.ceil(now.getMinutes() / 15) * 15;
  if (minutes === 60) {
    now.setHours(now.getHours() + 1, 0, 0, 0);
  } else {
    now.setMinutes(minutes, 0, 0);
  }
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();
  return {
    date: local.slice(0, 10),
    time: local.slice(11, 16)
  };
}

function toLocalDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function dateInputToEndOfDayIso(value: string) {
  return new Date(`${value}T23:59:59.999`).toISOString();
}

function getTodayDateInput() {
  return getDefaultManualDateTime().date;
}

function getStatusClass(status: EventItem["status"]) {
  return `status-chip status-chip--${status}`;
}

export default function TasksPage() {
  const { language, t } = useLanguage();
  const searchParams = useSearchParams();
  const { events, roles, currentRoleId, loading, error: loadError, hasMore, loadMore, createEvent: addEvent, updateEvent: modifyEvent, deleteEvent: removeEvent } = useEvents();
  const [error, setError] = useState("");

  const [titleZh, setTitleZh] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [datetime, setDatetime] = useState(() => getNowDatetimeInput());
  const [manualDate, setManualDate] = useState(() => getDefaultManualDateTime().date);
  const [manualTime, setManualTime] = useState(() => getDefaultManualDateTime().time);
  const [type, setType] = useState(EVENT_TYPES[0]);
  const [repeatCycle, setRepeatCycle] = useState<"none" | "daily" | "weekly" | "monthly" | "yearly">("none");
  const [repeatUntil, setRepeatUntil] = useState(() => getTodayDateInput());
  const [issuedByRoleId, setIssuedByRoleId] = useState("");
  const [assigneeRoleIds, setAssigneeRoleIds] = useState<string[]>([]);
  const [nlInput, setNlInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [confirmingParsedTask, setConfirmingParsedTask] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<Array<{
    titleZh: string;
    titleEn: string;
    manualDate: string;
    manualTime: string;
    type: string;
    repeatCycle: "none" | "daily" | "weekly" | "monthly" | "yearly";
    repeatUntil: string;
    assigneeRoleIds: string[];
  }>>([]);
  const [createMode, setCreateMode] = useState<"nl" | "manual">("nl");
  const [editingEventId, setEditingEventId] = useState("");
  const [editTitleZh, setEditTitleZh] = useState("");
  const [editTitleEn, setEditTitleEn] = useState("");
  const [editDatetime, setEditDatetime] = useState(() => getNowDatetimeInput());
  const [editType, setEditType] = useState(EVENT_TYPES[0]);
  const [editRepeatCycle, setEditRepeatCycle] = useState<"none" | "daily" | "weekly" | "monthly" | "yearly">("none");
  const [editRepeatUntil, setEditRepeatUntil] = useState(() => getTodayDateInput());
  const [editIssuedByRoleId, setEditIssuedByRoleId] = useState("");
  const [editAssigneeRoleIds, setEditAssigneeRoleIds] = useState<string[]>([]);
  const [mineFilter, setMineFilter] = useState<"unfinished" | "done">("unfinished");
  const [arrangedFilter, setArrangedFilter] = useState<"unfinished" | "done">("unfinished");
  const [mineExpanded, setMineExpanded] = useState(true);
  const [arrangedExpanded, setArrangedExpanded] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [completingTaskId, setCompletingTaskId] = useState("");
  const [deletingTaskId, setDeletingTaskId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState<Set<string>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<Array<{
    src: string;
    thumbnail?: string;
    alt: string;
  }>>([]);

  useEffect(() => {
    if (!issuedByRoleId && currentRoleId) {
      setIssuedByRoleId(currentRoleId);
    }
  }, [currentRoleId, issuedByRoleId]);

  async function loadAttachments(eventId: string) {
    if (loadingAttachments.has(eventId)) return;

    setLoadingAttachments(prev => new Set(prev).add(eventId));
    const res = await fetch(`/api/events/${eventId}/attachments`);
    if (res.ok) {
      const { attachments } = await res.json();
      modifyEvent(eventId, { attachments });
    }
    setLoadingAttachments(prev => {
      const next = new Set(prev);
      next.delete(eventId);
      return next;
    });
  }

  function openLightbox(eventId: string, imageIndex: number) {
    const event = events.find(e => e.id === eventId);
    if (!event || !event.attachments) return;

    const images = event.attachments
      .filter(f => f.mimetype.startsWith("image/"))
      .map(f => ({
        src: `/api/files/${f.filepath.split('/').pop()}`,
        thumbnail: f.thumbnail,
        alt: f.filename
      }));

    setLightboxImages(images);
    setLightboxIndex(imageIndex);
    setLightboxOpen(true);
  }

  useEffect(() => {
    const nextCreateMode = searchParams.get("create");
    const nextDate = searchParams.get("date");
    if (nextCreateMode !== "manual" || !nextDate) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) return;

    setCreateMode("manual");
    setConfirmingParsedTask(false);
    setManualDate(nextDate);
    setDatetime(`${nextDate}T${manualTime || "08:00"}`);
  }, [searchParams, manualTime]);

  const mine = useMemo(() => {
    return [...events]
      .filter((item) => item.assignees.some((a) => a.id === currentRoleId))
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }, [events, currentRoleId]);

  const otherTasks = useMemo(() => {
    return [...events]
      .filter((item) => item.issuedBy.id === currentRoleId)
      .filter((item) => !item.assignees.some((a) => a.id === currentRoleId))
      .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }, [events, currentRoleId]);

  const mineUnfinished = useMemo(() => mine.filter((item) => item.status !== "done"), [mine]);
  const mineDone = useMemo(() => mine.filter((item) => item.status === "done"), [mine]);
  const otherUnfinished = useMemo(() => otherTasks.filter((item) => item.status !== "done"), [otherTasks]);
  const otherDone = useMemo(() => otherTasks.filter((item) => item.status === "done"), [otherTasks]);

  async function createEvent(attachments: Array<{
    filename: string;
    filepath: string;
    thumbnail?: string;
    mimetype: string;
    size: number;
  }> = []) {
    const effectiveDatetime = createMode === "manual" || confirmingParsedTask
      ? combineDateAndTime(manualDate, manualTime)
      : datetime;

    if (!effectiveDatetime || Number.isNaN(new Date(effectiveDatetime).getTime())) {
      setError(`${t("datetime")}不能为空`);
      return;
    }

    if (repeatCycle !== "none" && !repeatUntil) {
      setError(`${t("repeatUntil")}不能为空`);
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const currentRole = roles.find(r => r.id === currentRoleId) || { id: currentRoleId, name: "", nameEn: "" };
    const tempEvent: EventItem = {
      id: tempId,
      titleZh,
      titleEn,
      datetime: new Date(effectiveDatetime).toISOString(),
      type,
      repeatCycle,
      repeatUntil: repeatCycle === "none" ? null : dateInputToEndOfDayIso(repeatUntil),
      status: "pending",
      creator: currentRole,
      issuedBy: roles.find(r => r.id === issuedByRoleId) || currentRole,
      assignees: roles.filter(r => assigneeRoleIds.includes(r.id)),
      isSaving: true
    };

    addEvent(tempEvent);

    setCreatingTask(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titleZh,
        titleEn,
        datetime: new Date(effectiveDatetime).toISOString(),
        type,
        repeatCycle,
        repeatUntil: repeatCycle === "none" ? null : dateInputToEndOfDayIso(repeatUntil),
        issuedByRoleId,
        assigneeAll: false,
        assigneeRoleIds,
        attachments
      })
    });

    setCreatingTask(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      removeEvent(tempId);
      setError(json.error ?? "创建任务失败");
      return;
    }

    const json = await res.json();
    removeEvent(tempId);
    addEvent(json.event);

    setTitleZh("");
    setTitleEn("");
    setDatetime(getNowDatetimeInput());
    setManualDate(getDefaultManualDateTime().date);
    setManualTime(getDefaultManualDateTime().time);
    setType(EVENT_TYPES[0]);
    setRepeatCycle("none");
    setRepeatUntil(getTodayDateInput());
    setIssuedByRoleId(currentRoleId);
    setAssigneeRoleIds([]);
    setConfirmingParsedTask(false);
    setNlInput("");
    setCreateMode("nl");
  }

  async function parseNaturalLanguage() {
    if (!nlInput.trim()) return;
    setParsing(true);
    setError("");
    try {
      const res = await fetch("/api/llm/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: nlInput.trim() })
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "解析失败，请手动填写");
        return;
      }

      const results = json.results || [];
      const tasks = results.map((parsed: any) => {
        const parsedDatetime = toLocalDatetimeInput(parsed.datetime) || getNowDatetimeInput();
        const parsedParts = splitLocalDatetime(parsedDatetime);

        let assigneeIds: string[] = [];
        if (parsed.assignee === "all") {
          assigneeIds = roles.map((role) => role.id);
        } else if (parsed.assignee) {
          // 支持逗号分隔的多个ID
          const ids = parsed.assignee.split(',').map((id: string) => id.trim());
          assigneeIds = ids.filter((id: string) => roles.some((r) => r.id === id));
        }

        const nextRepeatCycle = parsed.repeat_cycle ?? "none";
        const nextRepeatUntil = toLocalDateInput(parsed.repeat_until ?? null);

        return {
          titleZh: parsed.title_zh ?? "",
          titleEn: parsed.title_en ?? "",
          manualDate: parsedParts.date || getDefaultManualDateTime().date,
          manualTime: parsedParts.time || getDefaultManualDateTime().time,
          type: parsed.type || EVENT_TYPES[0],
          repeatCycle: nextRepeatCycle,
          repeatUntil: nextRepeatCycle === "none" ? "" : (nextRepeatUntil || getTodayDateInput()),
          assigneeRoleIds: assigneeIds
        };
      });

      setParsedTasks(tasks);
      setIssuedByRoleId(currentRoleId);
      setConfirmingParsedTask(true);
      setCreateMode("nl");
    } finally {
      setParsing(false);
    }
  }

  async function updateStatus(eventId: string, status: "pending" | "done" | "cancelled") {
    setCompletingTaskId(eventId);
    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "status", status })
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "更新状态失败");
      setCompletingTaskId("");
      return;
    }

    modifyEvent(eventId, { status });
    setCompletingTaskId("");
  }

  async function editEvent(item: EventItem) {
    setEditingEventId(item.id);
    setEditTitleZh(item.titleZh);
    setEditTitleEn(item.titleEn);
    setEditDatetime(toLocalDatetimeInput(item.datetime) || getNowDatetimeInput());
    setEditType(item.type);
    setEditRepeatCycle(item.repeatCycle);
    setEditRepeatUntil(toLocalDateInput(item.repeatUntil) || getTodayDateInput());
    setEditIssuedByRoleId(item.issuedBy.id);
    setEditAssigneeRoleIds(item.assignees.map((a) => a.id));
  }

  async function saveEditedEvent(item: EventItem) {
    if (editRepeatCycle !== "none" && !editRepeatUntil) {
      setError(`${t("repeatUntil")}不能为空`);
      return;
    }

    setSavingEdit(true);
    const res = await fetch(`/api/events/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "edit",
        titleZh: editTitleZh,
        titleEn: editTitleEn,
        datetime: new Date(editDatetime).toISOString(),
        type: editType,
        repeatCycle: editRepeatCycle,
        repeatUntil: editRepeatCycle === "none" ? null : dateInputToEndOfDayIso(editRepeatUntil),
        issuedByRoleId: editIssuedByRoleId,
        assigneeAll: false,
        assigneeRoleIds: editAssigneeRoleIds
      })
    });

    setSavingEdit(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "修改失败");
      return;
    }

    const json = await res.json();
    modifyEvent(item.id, json.event);
    setEditingEventId("");
  }

  async function deleteEvent(eventId: string) {
    setDeletingTaskId(eventId);
    const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "删除失败");
      setDeletingTaskId("");
      return;
    }
    removeEvent(eventId);
    setDeletingTaskId("");
  }

  function toggleAssignee(roleId: string) {
    setAssigneeRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  }

  function toggleEditAssignee(roleId: string) {
    setEditAssigneeRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  }

  const repeatOptions = [
    { value: "none", label: t("repeatNone") },
    { value: "daily", label: t("repeatDaily") },
    { value: "weekly", label: t("repeatWeekly") },
    { value: "monthly", label: t("repeatMonthly") },
    { value: "yearly", label: t("repeatYearly") }
  ] as const;

  const showRepeatFields = confirmingParsedTask && repeatCycle !== "none";
  const showManualRepeatFields = createMode === "manual" && repeatCycle !== "none";

  function enterManualMode() {
    const next = datetime ? splitLocalDatetime(datetime) : getDefaultManualDateTime();
    setManualDate(next.date || getDefaultManualDateTime().date);
    setManualTime(next.time || "08:00");
    setCreateMode("manual");
    setConfirmingParsedTask(false);
    setIssuedByRoleId((prev) => prev || currentRoleId);
  }

  function renderCard(item: EventItem, showAssignee: boolean) {
    const isCreator = item.creator.id === currentRoleId;
    const isAssignee = item.assignees.some((a) => a.id === currentRoleId);
    const isEditing = editingEventId === item.id;
    const isSelected = selectedTaskId === item.id;

    return (
      <li
        key={item.id}
        className={`task-card${item.status === "done" ? " task-card--done" : ""}${isSelected ? " task-card--selected" : ""}`}
        onClick={() => {
          const willExpand = !isSelected;
          setSelectedTaskId(isSelected ? "" : item.id);
          if (willExpand && !item.attachments) {
            loadAttachments(item.id);
          }
        }}
      >
        <p className="task-card__meta" style={{ fontSize: "0.95rem", marginBottom: "0.3rem" }}>
          {formatDatetime(item.datetime, language)} | {translateTaskType(item.type, language)}
        </p>
        <p
          style={{ textDecoration: item.status === "done" ? "line-through" : "none", fontWeight: "normal", fontSize: "1.05rem", lineHeight: "1.4", margin: 0 }}
        >
          {language === "en" && item.titleEn ? item.titleEn : item.titleZh}
        </p>

        {item.repeatCycle !== "none" && item.repeatUntil ? (
          <div className="task-card__meta">
            {t("repeatCycle")}：{repeatOptions.find((option) => option.value === item.repeatCycle)?.label} | {t("repeatUntil")}：
            {formatDatetime(item.repeatUntil, language)}
          </div>
        ) : null}

        <div className={`btn-row task-card__actions${isSelected ? " task-card__actions--visible" : ""}`} style={{ marginTop: "0.9rem", flexWrap: "nowrap", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {isAssignee ? (
              <button
                onClick={(e) => { e.stopPropagation(); updateStatus(item.id, item.status === "done" ? "pending" : "done"); }}
                className="btn btn-primary btn-sm"
                disabled={completingTaskId === item.id}
              >
                {completingTaskId === item.id
                  ? (language === "zh" ? "处理中..." : "Processing...")
                  : (item.status === "done"
                      ? (language === "zh" ? "取消完成" : "Undo")
                      : t("finish"))}
              </button>
            ) : null}
            {isCreator ? (
              <button onClick={(e) => { e.stopPropagation(); editEvent(item); }} className="btn btn-ghost btn-sm">
                {t("edit")}
              </button>
            ) : null}
          </div>
          <div className="task-card__meta" style={{ margin: 0 }}>
            {showAssignee
              ? `${t("taskAssignee")}：${item.assignees.map((a) => displayRoleName(a, language)).join("、")}`
              : `${t("taskIssuer")}：${displayRoleName(item.issuedBy, language)}`}
          </div>
        </div>

        {isSelected && loadingAttachments.has(item.id) ? (
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--line)", color: "var(--muted)", textAlign: "center" }}>
            {t("loadingAttachments")}
          </div>
        ) : null}

        {isSelected && item.attachments && item.attachments.length > 0 ? (
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--line)" }}>
            <div className="eyebrow" style={{ marginBottom: "0.5rem" }}>附件</div>
            {item.attachments.map((file) => {
              const isImage = file.mimetype.startsWith("image/");
              const protectedUrl = `/api/files/${file.filepath.split('/').pop()}`;
              return (
                <div key={file.id} style={{ marginBottom: "1rem" }}>
                  {isImage ? (
                    <div>
                      <img
                        src={file.thumbnail || protectedUrl}
                        alt={file.filename}
                        onClick={(e) => {
                          e.stopPropagation();
                          const imageIndex = item.attachments!
                            .filter(f => f.mimetype.startsWith("image/"))
                            .findIndex(f => f.id === file.id);
                          openLightbox(item.id, imageIndex);
                        }}
                        style={{
                          width: "100%",
                          height: "auto",
                          borderRadius: "8px",
                          marginBottom: "0.5rem",
                          cursor: "pointer"
                        }}
                      />
                      <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                        📎 {file.filename} ({(file.size / 1024).toFixed(1)} KB)
                      </div>
                    </div>
                  ) : (
                    <a
                      href={protectedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--theme-brand)", textDecoration: "none" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      📎 {file.filename} ({(file.size / 1024).toFixed(1)} KB)
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {isCreator && isEditing ? (
          <TaskEditForm
            language={language}
            t={t}
            roles={roles}
            eventTypes={EVENT_TYPES}
            repeatOptions={repeatOptions}
            titleZh={editTitleZh}
            titleEn={editTitleEn}
            datetime={editDatetime}
            type={editType}
            repeatCycle={editRepeatCycle}
            repeatUntil={editRepeatUntil}
            assigneeRoleIds={editAssigneeRoleIds}
            deleting={deletingTaskId === item.id}
            saving={savingEdit}
            setTitleZh={setEditTitleZh}
            setTitleEn={setEditTitleEn}
            setDatetime={setEditDatetime}
            setType={setEditType}
            setRepeatCycle={setEditRepeatCycle}
            setRepeatUntil={setEditRepeatUntil}
            onToggleAssignee={toggleEditAssignee}
            onSave={() => saveEditedEvent(item)}
            onCancel={() => setEditingEventId("")}
            onDelete={() => deleteEvent(item.id)}
          />
        ) : null}
      </li>
    );
  }

  return (
    <main className="section-grid">
      <section className="panel">
        <div className="section-grid">
          {createMode === "nl" ? (
            <>
              {!confirmingParsedTask ? (
                <>
                  <textarea
                    rows={4}
                    placeholder={t("parseExample")}
                    value={nlInput}
                    onChange={(e) => setNlInput(e.target.value)}
                  />
                  <div className="btn-row">
                    <button type="button" onClick={parseNaturalLanguage} disabled={parsing} className="btn btn-accent">
                      {parsing ? t("parsing") : t("autoParseTask")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={enterManualMode}
                    >
                      {t("manualInputTask")}
                    </button>
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <TaskCreateForm
              t={t}
              roles={roles}
              repeatOptions={repeatOptions}
              titleZh={titleZh}
              manualDate={manualDate}
              manualTime={manualTime}
              repeatCycle={repeatCycle}
              repeatUntil={repeatUntil}
              assigneeRoleIds={assigneeRoleIds}
              plain
              creating={creatingTask}
              cancelLabel={t("autoParseTask")}
              submitLabel={t("createTaskButton")}
              setTitleZh={setTitleZh}
              setManualDate={setManualDate}
              setManualTime={setManualTime}
              setRepeatCycle={setRepeatCycle}
              setRepeatUntil={setRepeatUntil}
              onToggleAssignee={toggleAssignee}
              onCancel={() => {
                setCreateMode("nl");
                setConfirmingParsedTask(false);
              }}
              onSubmit={(files) => createEvent(files)}
              onEnableRepeat={() => {
                setRepeatCycle("daily");
                setRepeatUntil((prev) => prev || getTodayDateInput());
              }}
              onDisableRepeat={() => {
                setRepeatCycle("none");
                setRepeatUntil("");
              }}
            />
          )}

          {createMode === "nl" && confirmingParsedTask ? (
            <>
              {parsedTasks.map((task, index) => (
                <TaskCreateForm
                  key={index}
                  t={t}
                  roles={roles}
                  repeatOptions={repeatOptions}
                  titleZh={task.titleZh}
                  manualDate={task.manualDate}
                  manualTime={task.manualTime}
                  repeatCycle={task.repeatCycle}
                  repeatUntil={task.repeatUntil}
                  assigneeRoleIds={task.assigneeRoleIds}
                  creating={creatingTask}
                  cancelLabel={index === 0 ? t("manualInputTask") : t("delete")}
                  submitLabel={t("confirmTask")}
                  setTitleZh={(val) => {
                    setParsedTasks((prev) => prev.map((t, i) => i === index ? { ...t, titleZh: val } : t));
                  }}
                  setManualDate={(val) => {
                    setParsedTasks((prev) => prev.map((t, i) => i === index ? { ...t, manualDate: val } : t));
                  }}
                  setManualTime={(val) => {
                    setParsedTasks((prev) => prev.map((t, i) => i === index ? { ...t, manualTime: val } : t));
                  }}
                  setRepeatCycle={(val) => {
                    setParsedTasks((prev) => prev.map((t, i) => i === index ? { ...t, repeatCycle: val } : t));
                  }}
                  setRepeatUntil={(val) => {
                    setParsedTasks((prev) => prev.map((t, i) => i === index ? { ...t, repeatUntil: val } : t));
                  }}
                  onToggleAssignee={(roleId) => {
                    setParsedTasks((prev) => prev.map((t, i) => {
                      if (i !== index) return t;
                      const ids = t.assigneeRoleIds.includes(roleId)
                        ? t.assigneeRoleIds.filter((id) => id !== roleId)
                        : [...t.assigneeRoleIds, roleId];
                      return { ...t, assigneeRoleIds: ids };
                    }));
                  }}
                  onCancel={() => {
                    if (index === 0) {
                      enterManualMode();
                    } else {
                      setParsedTasks((prev) => prev.filter((_, i) => i !== index));
                    }
                  }}
                  onSubmit={async (files) => {
                    const effectiveDatetime = combineDateAndTime(task.manualDate, task.manualTime);
                    if (!effectiveDatetime || Number.isNaN(new Date(effectiveDatetime).getTime())) {
                      setError(`${t("datetime")}不能为空`);
                      return;
                    }
                    if (task.repeatCycle !== "none" && !task.repeatUntil) {
                      setError(`${t("repeatUntil")}不能为空`);
                      return;
                    }
                    if (task.assigneeRoleIds.length === 0) {
                      setError("至少选择一个负责人");
                      return;
                    }

                    const tempId = `temp-${Date.now()}-${index}`;
                    const currentRole = roles.find(r => r.id === currentRoleId) || { id: currentRoleId, name: "", nameEn: "" };
                    const tempEvent: EventItem = {
                      id: tempId,
                      titleZh: task.titleZh,
                      titleEn: task.titleEn,
                      datetime: new Date(effectiveDatetime).toISOString(),
                      type: task.type,
                      repeatCycle: task.repeatCycle,
                      repeatUntil: task.repeatCycle === "none" ? null : dateInputToEndOfDayIso(task.repeatUntil),
                      status: "pending",
                      creator: currentRole,
                      issuedBy: roles.find(r => r.id === issuedByRoleId) || currentRole,
                      assignees: roles.filter(r => task.assigneeRoleIds.includes(r.id)),
                      isSaving: true
                    };

                    addEvent(tempEvent);

                    setCreatingTask(true);
                    const res = await fetch("/api/events", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        titleZh: task.titleZh,
                        titleEn: task.titleEn,
                        datetime: new Date(effectiveDatetime).toISOString(),
                        type: task.type,
                        repeatCycle: task.repeatCycle,
                        repeatUntil: task.repeatCycle === "none" ? null : dateInputToEndOfDayIso(task.repeatUntil),
                        issuedByRoleId,
                        assigneeAll: false,
                        assigneeRoleIds: task.assigneeRoleIds,
                        attachments: files
                      })
                    });

                    setCreatingTask(false);
                    if (!res.ok) {
                      const json = await res.json().catch(() => ({}));
                      removeEvent(tempId);
                      setError(json.error ?? "创建任务失败");
                      return;
                    }

                    const json = await res.json();
                    removeEvent(tempId);
                    addEvent(json.event);

                    setParsedTasks((prev) => prev.filter((_, i) => i !== index));
                    if (parsedTasks.length === 1) {
                      setConfirmingParsedTask(false);
                      setNlInput("");
                      setCreateMode("nl");
                    }
                  }}
                  onEnableRepeat={() => {
                    setParsedTasks((prev) => prev.map((t, i) =>
                      i === index ? { ...t, repeatCycle: "daily", repeatUntil: t.repeatUntil || getTodayDateInput() } : t
                    ));
                  }}
                  onDisableRepeat={() => {
                    setParsedTasks((prev) => prev.map((t, i) =>
                      i === index ? { ...t, repeatCycle: "none", repeatUntil: "" } : t
                    ));
                  }}
                />
              ))}
            </>
          ) : null}
        </div>
      </section>

      {loading ? <div className="inline-note">{t("loadingTasks")}</div> : null}
      {error ? <div className="error-note">{error}</div> : null}

      <section className="section-grid section-grid--two">
        <section className="panel">
          <div
            className="collapsible-toggle collapsible-toggle--panel"
            onClick={() => setMineExpanded((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setMineExpanded((prev) => !prev);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <span className="headline">{t("assignedToMe")}</span>
            <span className="task-filter-row" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={`pill pill-button${mineFilter === "unfinished" ? " pill--active" : ""}`}
                onClick={() => setMineFilter("unfinished")}
              >
                {t("unfinished")} {mineUnfinished.length}
              </button>
              <button
                type="button"
                className={`pill pill-button${mineFilter === "done" ? " pill--active" : ""}`}
                onClick={() => setMineFilter("done")}
              >
                {t("completed")} {mineDone.length}
              </button>
              <span className="collapse-indicator" aria-hidden="true">{mineExpanded ? "▴" : "▾"}</span>
            </span>
          </div>
          {mineExpanded ? (
            <>
              {!loading && (mineFilter === "unfinished" ? mineUnfinished : mineDone).length === 0 ? (
                <div className="empty-state">{t("noMineTasks")}</div>
              ) : null}
              <ul className="task-list">{(mineFilter === "unfinished" ? mineUnfinished : mineDone).map((item) => renderCard(item, false))}</ul>
            </>
          ) : null}
        </section>

        <section className="panel">
          <div
            className="collapsible-toggle collapsible-toggle--panel"
            onClick={() => setArrangedExpanded((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setArrangedExpanded((prev) => !prev);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <span className="headline">{t("otherTasks")}</span>
            <span className="task-filter-row" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={`pill pill-button${arrangedFilter === "unfinished" ? " pill--active" : ""}`}
                onClick={() => setArrangedFilter("unfinished")}
              >
                {t("unfinished")} {otherUnfinished.length}
              </button>
              <button
                type="button"
                className={`pill pill-button${arrangedFilter === "done" ? " pill--active" : ""}`}
                onClick={() => setArrangedFilter("done")}
              >
                {t("completed")} {otherDone.length}
              </button>
              <span className="collapse-indicator" aria-hidden="true">{arrangedExpanded ? "▴" : "▾"}</span>
            </span>
          </div>
          {arrangedExpanded ? (
            <>
              {!loading && (arrangedFilter === "unfinished" ? otherUnfinished : otherDone).length === 0 ? (
                <div className="empty-state">{t("noOtherTasks")}</div>
              ) : null}
              <ul className="task-list">{(arrangedFilter === "unfinished" ? otherUnfinished : otherDone).map((item) => renderCard(item, true))}</ul>
            </>
          ) : null}
        </section>
      </section>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={lightboxImages}
        plugins={[Zoom, Download]}
        zoom={{
          maxZoomPixelRatio: 3,
          scrollToZoom: true
        }}
      />
    </main>
  );
}
