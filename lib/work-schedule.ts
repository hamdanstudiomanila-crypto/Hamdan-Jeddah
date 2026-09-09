export const WORK_TIME_ZONE = 'Asia/Riyadh';
export const WORK_SCHEDULE_EFFECTIVE_DATE = '2026-09-08';
export const WORK_START_HOUR = 8;
export const WORK_END_HOUR = 18;

export function workDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: WORK_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// Preserve the old Monday–Friday calendar before the policy took effect.
export function isScheduledWorkday(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (!Number.isFinite(day)) return false;
  return date < WORK_SCHEDULE_EFFECTIVE_DATE ? day !== 0 && day !== 6 : day !== 5 && day !== 6;
}

export function isWorkingDate(date: string, holidays: Iterable<string> = []): boolean {
  return isScheduledWorkday(date) && !new Set(holidays).has(date);
}
