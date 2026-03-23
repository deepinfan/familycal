import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateICalendar(events: any[], roleId: string) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FamilyCal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "REFRESH-INTERVAL;VALUE=DURATION:PT10M",
    "X-PUBLISHED-TTL:PT10M"
  ];

  for (const event of events) {
    const uid = `${event.id}@familycal.app`;
    const dtstart = formatDateTime(event.datetime);
    const summary = event.titleZh || event.titleEn;
    const status = event.status === "done" ? "COMPLETED" : "NEEDS-ACTION";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`STATUS:${status}`);
    lines.push(`DTSTAMP:${formatDateTime(event.updatedAt)}`);

    if (event.repeatCycle !== "none" && event.repeatUntil) {
      const rrule = generateRRule(event.repeatCycle, event.repeatUntil);
      lines.push(`RRULE:${rrule}`);
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function generateRRule(cycle: string, until: Date | string): string {
  const freq = cycle.toUpperCase();
  const untilStr = formatDateTime(until);
  return `FREQ=${freq};UNTIL=${untilStr}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string }> }
) {
  const { key } = await context.params;

  const role = await prisma.role.findUnique({
    where: { calendarSubscriptionKey: key }
  });

  if (!role) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const events = await prisma.event.findMany({
    where: {
      assignees: {
        some: { roleId: role.id }
      }
    },
    orderBy: { datetime: "asc" }
  });

  const ical = generateICalendar(events, role.id);

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "inline; filename=calendar.ics",
      "Cache-Control": "no-cache, must-revalidate"
    }
  });
}
