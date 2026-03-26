"use client";

import { useEffect, useMemo, useState } from "react";
import { translateStatus, useLanguage, weekdayLabels } from "../language-context";
import { TaskCreateForm } from "../task-create-form";
import { TaskEditForm } from "../task-edit-form";
import { useEvents, type EventItem, type Role } from "../events-context";

const EVENT_TYPES = ["学习", "玩耍", "家务", "购物", "其他"];

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function buildWeekDays(anchor: Date) {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function buildMonthGrid(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function formatTime(value: string, language: "zh" | "en") {
  return new Date(value).toLocaleTimeString(language === "zh" ? "zh-CN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function toMonthInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toLocalDatetimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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

function getTodayDateInput() {
  return getDefaultManualDateTime().date;
}

function displayTaskTitle(item: EventItem, language: "zh" | "en") {
  if (language === "en" && item.titleEn?.trim()) return item.titleEn;
  return item.titleZh;
}

export default function CalendarPage() {
  const { language, t } = useLanguage();
  const { events, roles, currentRoleId, loading, hasMore, loadMore, createEvent: addEvent, updateEvent: modifyEvent, deleteEvent: removeEvent } = useEvents();
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(new Date());
  const [activeDate, setActiveDate] = useState<string>(toDateKey(new Date()));
  const [weekNotice, setWeekNotice] = useState("");
  const [showCreateButtonKey, setShowCreateButtonKey] = useState("");
  const [creatingDateKey, setCreatingDateKey] = useState("");
  const [createTitleZh, setCreateTitleZh] = useState("");
  const [createManualDate, setCreateManualDate] = useState(() => getDefaultManualDateTime().date);
  const [createManualTime, setCreateManualTime] = useState(() => getDefaultManualDateTime().time);
  const [createType, setCreateType] = useState(EVENT_TYPES[0]);
  const [createRepeatCycle, setCreateRepeatCycle] = useState<EventItem["repeatCycle"]>("none");
  const [createRepeatUntil, setCreateRepeatUntil] = useState("");
  const [createAssigneeRoleIds, setCreateAssigneeRoleIds] = useState<string[]>([]);
  const [editingEventId, setEditingEventId] = useState("");
  const [editTitleZh, setEditTitleZh] = useState("");
  const [editTitleEn, setEditTitleEn] = useState("");
  const [editDatetime, setEditDatetime] = useState("");
  const [editType, setEditType] = useState(EVENT_TYPES[0]);
  const [editRepeatCycle, setEditRepeatCycle] = useState<EventItem["repeatCycle"]>("none");
  const [editRepeatUntil, setEditRepeatUntil] = useState("");
  const [editAssigneeRoleIds, setEditAssigneeRoleIds] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [completingTaskId, setCompletingTaskId] = useState("");
  const [deletingTaskId, setDeletingTaskId] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  const repeatOptions = [
    { value: "none", label: t("repeatNone") },
    { value: "daily", label: t("repeatDaily") },
    { value: "weekly", label: t("repeatWeekly") },
    { value: "monthly", label: t("repeatMonthly") },
    { value: "yearly", label: t("repeatYearly") }
  ] as const;

  async function updateStatus(eventId: string, nextStatus: "pending" | "done") {
    const target = events.find((item) => item.id === eventId);
    if (!target?.assignees.some((assignee) => assignee.id === currentRoleId)) {
      setWeekNotice(language === "zh" ? "只有任务责任人可以勾选完成" : "Only assignees can mark this task done");
      return;
    }

    setCompletingTaskId(eventId);
    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "status", status: nextStatus })
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setWeekNotice(json.error ?? (language === "zh" ? "更新任务状态失败" : "Failed to update task status"));
      setCompletingTaskId("");
      return;
    }

    modifyEvent(eventId, { status: nextStatus });
    setCompletingTaskId("");
  }

  function openEditor(item: EventItem) {
    setEditingEventId(item.id);
    setEditTitleZh(item.titleZh);
    setEditTitleEn(item.titleEn);
    setEditDatetime(toLocalDatetimeInput(item.datetime));
    setEditType(item.type);
    setEditRepeatCycle(item.repeatCycle);
    setEditRepeatUntil(toLocalDatetimeInput(item.repeatUntil)?.slice(0, 10) ?? "");
    setEditAssigneeRoleIds(item.assignees.map((assignee) => assignee.id));
    setWeekNotice("");
  }

  function toggleEditAssignee(roleId: string) {
    setEditAssigneeRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  }

  function openCreateForm(dateKey: string) {
    setCreatingDateKey((prev) => (prev === dateKey ? "" : dateKey));
    setCreateTitleZh("");
    setCreateManualDate(dateKey);
    setCreateManualTime(getDefaultManualDateTime().time);
    setCreateType(EVENT_TYPES[0]);
    setCreateRepeatCycle("none");
    setCreateRepeatUntil("");
    setCreateAssigneeRoleIds([]);
    setWeekNotice("");
  }

  function toggleCreateAssignee(roleId: string) {
    setCreateAssigneeRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  }

  async function createEventForDay() {
    if (!createTitleZh.trim()) {
      setWeekNotice(language === "zh" ? "请先填写任务内容" : "Please enter task content");
      return;
    }
    if (!createManualDate || !createManualTime) {
      setWeekNotice(language === "zh" ? "请先设置任务时间" : "Please set task time");
      return;
    }
    if (createAssigneeRoleIds.length === 0) {
      setWeekNotice(language === "zh" ? "至少选择一个负责人" : "Select at least one assignee");
      return;
    }
    if (createRepeatCycle !== "none" && !createRepeatUntil) {
      setWeekNotice(language === "zh" ? "请先设置重复截止日期" : "Please set repeat end date");
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const foundRole = roles.find(r => r.id === currentRoleId);
    const currentRole = foundRole ? { ...foundRole, nameEn: "" } : { id: currentRoleId, name: "", nameEn: "" };
    const tempEvent: EventItem = {
      id: tempId,
      titleZh: createTitleZh,
      titleEn: "",
      datetime: new Date(`${createManualDate}T${createManualTime}`).toISOString(),
      type: createType,
      repeatCycle: createRepeatCycle,
      repeatUntil: createRepeatCycle === "none" ? null : new Date(`${createRepeatUntil}T23:59:59.999`).toISOString(),
      status: "pending",
      creator: currentRole,
      issuedBy: currentRole,
      assignees: roles.filter(r => createAssigneeRoleIds.includes(r.id)).map(r => ({ ...r, nameEn: "" })),
      isSaving: true
    };

    addEvent(tempEvent);

    setCreatingTask(true);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titleZh: createTitleZh,
        titleEn: "",
        datetime: new Date(`${createManualDate}T${createManualTime}`).toISOString(),
        type: createType,
        repeatCycle: createRepeatCycle,
        repeatUntil: createRepeatCycle === "none" ? null : new Date(`${createRepeatUntil}T23:59:59.999`).toISOString(),
        assigneeAll: false,
        assigneeRoleIds: createAssigneeRoleIds
      })
    });

    setCreatingTask(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      removeEvent(tempId);
      setWeekNotice(json.error ?? (language === "zh" ? "创建任务失败" : "Failed to create task"));
      return;
    }

    const json = await res.json();
    removeEvent(tempId);
    addEvent(json.event);
    setCreatingDateKey("");
  }

  async function saveEditedEvent(item: EventItem) {
    if (!editDatetime) {
      setWeekNotice(language === "zh" ? "请先设置任务时间" : "Please set task time");
      return;
    }
    if ((language === "zh" ? editTitleZh : editTitleEn).trim() === "") {
      setWeekNotice(language === "zh" ? "请先填写任务内容" : "Please enter task content");
      return;
    }
    if (editAssigneeRoleIds.length === 0) {
      setWeekNotice(language === "zh" ? "至少选择一个负责人" : "Select at least one assignee");
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
        repeatUntil: editRepeatCycle === "none" ? null : (editRepeatUntil ? new Date(`${editRepeatUntil}T23:59:59.999`).toISOString() : null),
        issuedByRoleId: item.issuedBy.id,
        assigneeAll: false,
        assigneeRoleIds: editAssigneeRoleIds
      })
    });

    setSavingEdit(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setWeekNotice(json.error ?? (language === "zh" ? "更新任务失败" : "Failed to update task"));
      return;
    }

    setEditingEventId("");
  }

  async function deleteEvent(item: EventItem) {
    setDeletingTaskId(item.id);
    const res = await fetch(`/api/events/${item.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setWeekNotice(json.error ?? (language === "zh" ? "删除任务失败" : "Failed to delete task"));
      setDeletingTaskId("");
      return;
    }
    setEditingEventId("");
    removeEvent(item.id);
    setDeletingTaskId("");
  }

  const grouped = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const item of events) {
      // 只显示我下达的或分配给我的任务
      const isIssuedByMe = item.issuedBy.id === currentRoleId;
      const isAssignedToMe = item.assignees.some((assignee) => assignee.id === currentRoleId);
      if (!isIssuedByMe && !isAssignedToMe) continue;

      const key = toDateKey(new Date(item.datetime));
      const arr = map.get(key) ?? [];
      map.set(
        key,
        [...arr, item].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
      );
    }
    return map;
  }, [events, currentRoleId]);

  const weekDays = useMemo(() => buildWeekDays(anchor), [anchor]);
  const monthGrid = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const labels = weekdayLabels(language);
  const todayKey = toDateKey(new Date());

  const weekSections = useMemo(
    () =>
      weekDays.map((day) => {
        const key = toDateKey(day);
        return {
          key,
          day,
          events: grouped.get(key) ?? []
        };
      }),
    [grouped, weekDays]
  );
  const visibleWeekSections = useMemo(() => weekSections.filter(({ events: dayEvents }) => dayEvents.length > 0), [weekSections]);

  const activeEvents = grouped.get(activeDate) ?? [];

  const monthEvents = useMemo(() => {
    const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return events.filter((item) => {
      const eventDate = new Date(item.datetime);
      return eventDate >= monthStart && eventDate <= monthEnd;
    }).sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
  }, [events, anchor]);

  const monthSections = useMemo(() => {
    const sections: Array<{ key: string; day: Date; events: EventItem[] }> = [];
    const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);

    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const key = toDateKey(d);
      const dayEvents = grouped.get(key) ?? [];
      if (dayEvents.length > 0) {
        sections.push({ key, day: new Date(d), events: dayEvents });
      }
    }

    if (sections.length === 0) {
      const today = new Date();
      const todayKey = toDateKey(today);
      sections.push({ key: todayKey, day: today, events: [] });
    }

    return sections;
  }, [grouped, anchor]);

  function jumpToDay(key: string) {
    setActiveDate(key);
    if (view !== "week") return;
    const targetSection = weekSections.find((section) => section.key === key);
    if (!targetSection || targetSection.events.length === 0) {
      setWeekNotice(t("noTasksThatDay"));
      return;
    }
    setWeekNotice("");
    requestAnimationFrame(() => {
      document.getElementById(`week-day-${key}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }

  const renderCreateForm = () => (
    <TaskCreateForm
      t={t}
      roles={roles}
      repeatOptions={repeatOptions}
      titleZh={createTitleZh}
      manualDate={createManualDate}
      manualTime={createManualTime}
      repeatCycle={createRepeatCycle}
      repeatUntil={createRepeatUntil}
      assigneeRoleIds={createAssigneeRoleIds}
      plain
      creating={creatingTask}
      cancelLabel={language === "zh" ? "关闭" : "Close"}
      submitLabel={language === "zh" ? "创建任务" : "Create Task"}
      setTitleZh={setCreateTitleZh}
      setManualDate={setCreateManualDate}
      setManualTime={setCreateManualTime}
      setRepeatCycle={setCreateRepeatCycle}
      setRepeatUntil={setCreateRepeatUntil}
      onToggleAssignee={toggleCreateAssignee}
      onCancel={() => setCreatingDateKey("")}
      onSubmit={() => createEventForDay()}
      onEnableRepeat={() => {
        setCreateRepeatCycle("daily");
        setCreateRepeatUntil((prev) => prev || getTodayDateInput());
      }}
      onDisableRepeat={() => {
        setCreateRepeatCycle("none");
        setCreateRepeatUntil("");
      }}
    />
  );

  return (
    <main className="section-grid">
      <section className="panel">
        <div className="calendar-toolbar">
          <div className="calendar-toolbar__top">
            <div className="btn-row calendar-toolbar__group">
              <button onClick={() => setView("week")} className={`btn calendar-mode-btn ${view === "week" ? "btn-primary" : "btn-ghost"}`}>
                {language === "zh" ? "周" : "W"}
              </button>
              <button onClick={() => setView("month")} className={`btn calendar-mode-btn ${view === "month" ? "btn-primary" : "btn-ghost"}`}>
                {language === "zh" ? "月" : "M"}
              </button>
            </div>
            <input
              className="calendar-toolbar__period-input mono"
              type="month"
              value={toMonthInputValue(anchor)}
              onChange={(e) => {
                const [year, month] = e.target.value.split("-");
                if (!year || !month) return;
                setAnchor(new Date(Number(year), Number(month) - 1, 1));
              }}
              aria-label={language === "zh" ? "选择年月" : "Choose month"}
            />
            <div className="btn-row calendar-toolbar__group calendar-toolbar__group--right">
              <button
                onClick={() => {
                  const next = new Date(anchor);
                  if (view === "week") next.setDate(next.getDate() - 7);
                  else next.setMonth(next.getMonth() - 1);
                  setAnchor(next);
                }}
                className="btn btn-ghost calendar-nav-btn"
                aria-label={view === "week" ? t("previousWeek") : t("previousMonth")}
              >
                ←
              </button>
              <button
                onClick={() => {
                  const next = new Date(anchor);
                  if (view === "week") next.setDate(next.getDate() + 7);
                  else next.setMonth(next.getMonth() + 1);
                  setAnchor(next);
                }}
                className="btn btn-ghost calendar-nav-btn"
                aria-label={view === "week" ? t("nextWeek") : t("nextMonth")}
              >
                →
              </button>
            </div>
          </div>
        </div>

        {view === "week" ? (
          <div className="calendar-week-layout">
            <div className="week-strip" role="tablist" aria-label={t("weekView")}>
              {weekSections.map(({ day, key, events: dayEvents }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={activeDate === key}
                  onClick={() => jumpToDay(key)}
                  className={`week-strip__day${key === todayKey ? " week-strip__day--today" : ""}${activeDate === key ? " week-strip__day--active" : ""}`}
                >
                  <span className="week-strip__headline">
                    <span className="week-strip__label">{labels[day.getDay()]}</span>
                    <span className="week-strip__date">{day.getDate()}</span>
                  </span>
                </button>
              ))}
            </div>

            {weekNotice || (weekSections.find((section) => section.key === activeDate)?.events.length ?? 0) === 0 ? (
              <div className="week-notice-wrap">
                <div className="week-notice">
                  <span>{weekNotice || (language === "zh" ? "这一天没有任务安排" : "No tasks scheduled for this day")}</span>
                  {((weekSections.find((section) => section.key === activeDate)?.events.length ?? 0) === 0) ? (
                    <button
                      type="button"
                      className="btn btn-ghost week-notice__create-btn"
                      onClick={() => openCreateForm(activeDate)}
                    >
                      {language === "zh" ? "创建任务" : "Add Task"}
                    </button>
                  ) : null}
                </div>
                {creatingDateKey === activeDate && (weekSections.find((section) => section.key === activeDate)?.events.length ?? 0) === 0 ? renderCreateForm() : null}
              </div>
            ) : null}

            <div className="week-agenda">
              {visibleWeekSections.map(({ day, key, events: dayEvents }) => (
                <section
                  key={key}
                  id={`week-day-${key}`}
                  className={`week-agenda__section${activeDate === key ? " week-agenda__section--active" : ""}`}
                >
                  <div
                    className="week-agenda__head"
                    onClick={() => setShowCreateButtonKey(showCreateButtonKey === key ? "" : key)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="week-agenda__headline">
                      <span className="week-agenda__weekday">
                        {labels[day.getDay()]}
                      </span>
                      <h3 className="headline week-agenda__title">
                        {day.getMonth() + 1}/{day.getDate()}
                      </h3>
                    </div>
                    {showCreateButtonKey === key ? (
                      <div className="week-agenda__head-actions">
                        <button
                          type="button"
                          className="btn btn-ghost week-agenda__create-btn"
                          onClick={(e) => { e.stopPropagation(); openCreateForm(key); }}
                        >
                          {language === "zh" ? "创建任务" : "Add Task"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {creatingDateKey === key ? renderCreateForm() : null}
                  <ul className="plain-list week-agenda__list">
                    {dayEvents.map((item) => {
                      const isIssuedByMe = item.issuedBy.id === currentRoleId;
                      const isAssignedToMe = item.assignees.some((assignee) => assignee.id === currentRoleId);
                      const isEditing = editingEventId === item.id;
                      const isSelected = selectedTaskId === item.id;
                      return (
                        <li
                          key={item.id}
                          className={`month-task-item${item.status === "done" ? " month-task-item--done" : ""}${isSelected ? " month-task-item--selected" : ""}`}
                          onClick={() => setSelectedTaskId(isSelected ? "" : item.id)}
                        >
                          <div className="month-task-item__main">
                            <span className="month-task-item__time">{formatTime(item.datetime, language)}</span>
                            <span className="month-task-item__title">{displayTaskTitle(item, language)}</span>
                            <div className={`month-task-item__actions${isSelected ? " month-task-item__actions--visible" : ""}`}>
                              {isIssuedByMe ? (
                                <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEditor(item); }}>
                                  {language === "zh" ? "编辑" : "Edit"}
                                </button>
                              ) : null}
                              {isAssignedToMe ? (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={(e) => { e.stopPropagation(); updateStatus(item.id, item.status === "done" ? "pending" : "done"); }}
                                  disabled={completingTaskId === item.id}
                                >
                                  {completingTaskId === item.id ? (language === "zh" ? "处理中..." : "Processing...") : (item.status === "done" ? (language === "zh" ? "取消完成" : "Undo") : (language === "zh" ? "完成" : "Done"))}
                                </button>
                              ) : null}
                            </div>
                          </div>
                          {isIssuedByMe && isEditing ? (
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
                              onDelete={() => void deleteEvent(item)}
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        ) : (
          <div className="calendar-grid">
            {monthGrid.map((day) => {
              const key = toDateKey(day);
              const inMonth = day.getMonth() === anchor.getMonth();
              const dayEvents = grouped.get(key) ?? [];
              return (
                <button
                  key={key}
                  onClick={() => {
                    setActiveDate(key);
                    if (dayEvents.length > 0) {
                      requestAnimationFrame(() => {
                        const firstTask = document.querySelector(`[data-event-date="${key}"]`);
                        firstTask?.scrollIntoView({ behavior: "smooth", block: "start" });
                      });
                    }
                  }}
                  className={`calendar-card calendar-day${key === todayKey ? " calendar-day--today" : ""}${key === activeDate ? " calendar-day--active" : ""}`}
                  style={{ opacity: inMonth ? 1 : 0.38 }}
                >
                  <div style={{ color: day.getDay() === 0 || day.getDay() === 6 ? "#b42318" : "inherit", fontWeight: 700 }}>
                    {day.getDate()}
                  </div>
                  <div className="dot-row">
                    {Array.from({ length: Math.min(dayEvents.length, 3) }).map((_, i) => (
                      <span key={i} className="dot" />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {view === "month" ? (
        <section className="panel">
          <div className="section-head">
            <div>
              <h3 className="headline" style={{ fontSize: "1.35rem" }}>
                {anchor.getFullYear()}年{anchor.getMonth() + 1}月 {t("taskCount")}
              </h3>
            </div>
            <span className="pill">{monthEvents.length} {t("items")}</span>
          </div>
          {!loading && monthSections.length === 0 ? <div className="empty-state">{t("noTasksThatDay")}</div> : null}
          <div className="month-sections">
            {monthSections.map(({ key, day, events: dayEvents }) => (
              <section key={key} className="month-day-section" data-event-date={key}>
                <div className="month-day-section__header">
                  <span className="month-day-section__date">
                    {day.getMonth() + 1}/{day.getDate()} {labels[day.getDay()]}
                  </span>
                </div>
                {dayEvents.length === 0 ? (
                  <div className="week-notice" style={{ marginBottom: "1rem" }}>
                    <span>{language === "zh" ? "这一天没有任务安排" : "No tasks scheduled for this day"}</span>
                    <button
                      type="button"
                      className="btn btn-ghost week-notice__create-btn"
                      onClick={() => openCreateForm(key)}
                    >
                      {language === "zh" ? "创建任务" : "Add Task"}
                    </button>
                  </div>
                ) : null}
                {creatingDateKey === key && dayEvents.length === 0 ? renderCreateForm() : null}
                <ul className="plain-list month-day-section__tasks">
                  {dayEvents.map((item) => {
                    const isIssuedByMe = item.issuedBy.id === currentRoleId;
                    const isAssignedToMe = item.assignees.some((assignee) => assignee.id === currentRoleId);
                    const isEditing = editingEventId === item.id;
                    const isSelected = selectedTaskId === item.id;
                    return (
                      <li
                        key={item.id}
                        className={`month-task-item${item.status === "done" ? " month-task-item--done" : ""}${isSelected ? " month-task-item--selected" : ""}`}
                        onClick={() => setSelectedTaskId(isSelected ? "" : item.id)}
                      >
                        <div className="month-task-item__main">
                          <span className="month-task-item__time">{formatTime(item.datetime, language)}</span>
                          <span className="month-task-item__title">{displayTaskTitle(item, language)}</span>
                          <div className={`month-task-item__actions${isSelected ? " month-task-item__actions--visible" : ""}`}>
                            {isIssuedByMe ? (
                              <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); openEditor(item); }}>
                                {language === "zh" ? "编辑" : "Edit"}
                              </button>
                            ) : null}
                            {isAssignedToMe ? (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={(e) => { e.stopPropagation(); updateStatus(item.id, item.status === "done" ? "pending" : "done"); }}
                                disabled={completingTaskId === item.id}
                              >
                                {completingTaskId === item.id ? (language === "zh" ? "处理中..." : "Processing...") : (item.status === "done" ? (language === "zh" ? "取消完成" : "Undo") : (language === "zh" ? "完成" : "Done"))}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {isIssuedByMe && isEditing ? (
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
                            onDelete={() => void deleteEvent(item)}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
