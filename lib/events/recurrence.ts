export const REPEAT_CYCLES = ["none", "daily", "weekly", "monthly", "yearly"] as const;

export type RepeatCycle = (typeof REPEAT_CYCLES)[number];

function addCycle(date: Date, repeatCycle: RepeatCycle) {
  const next = new Date(date);

  switch (repeatCycle) {
    case "daily":
      next.setDate(next.getDate() + 1);
      return next;
    case "weekly":
      next.setDate(next.getDate() + 7);
      return next;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      return next;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      return next;
    default:
      return next;
  }
}

export function buildRecurringDates(startAt: Date, repeatCycle: RepeatCycle, repeatUntil: Date | null) {
  if (repeatCycle === "none" || !repeatUntil) {
    return [startAt];
  }

  const dates: Date[] = [];
  let current = new Date(startAt);
  let count = 0;

  while (current <= repeatUntil && count < 500) {
    dates.push(new Date(current));
    current = addCycle(current, repeatCycle);
    count += 1;
  }

  return dates;
}
