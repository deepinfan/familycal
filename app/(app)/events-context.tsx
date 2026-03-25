"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
};

type EventsContextType = {
  events: EventItem[];
  roles: Role[];
  currentRoleId: string;
  loading: boolean;
  error: string;
  loadEvents: () => Promise<void>;
  createEvent: (event: EventItem) => void;
  updateEvent: (id: string, updates: Partial<EventItem>) => void;
  deleteEvent: (id: string) => void;
};

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentRoleId, setCurrentRoleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEvents() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      if (!res.ok) throw new Error("加载失败");
      const json = await res.json();
      setEvents(json.events ?? []);
      setRoles(json.roles ?? []);
      setCurrentRoleId(json.currentRoleId ?? "");
    } catch {
      setError("加载任务失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const createEvent = (event: EventItem) => {
    setEvents(prev => [...prev, event].sort((a, b) =>
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    ));
  };

  const updateEvent = (id: string, updates: Partial<EventItem>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  return (
    <EventsContext.Provider value={{
      events, roles, currentRoleId, loading, error,
      loadEvents, createEvent, updateEvent, deleteEvent
    }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error("useEvents must be used within EventsProvider");
  }
  return context;
}
