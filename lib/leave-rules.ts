import { isScheduledWorkday } from './work-schedule';

// Jeddah accepts past, current, and future leave dates for HR review.
export function validateLeaveDateRange(start: string, end: string): string | null {
  if (!start || !end) return 'Please fill in the start and end date.';
  if (end < start) return 'End date cannot be before start date.';
  return null;
}

export function countChargeableLeaveDays(start: string, end: string, holidayDates: Iterable<string> = []) {
  if (!start || !end || end < start) return 0;
  const holidays = new Set(holidayDates);
  const cursor = new Date(`${start}T00:00:00Z`);
  const lastDay = new Date(`${end}T00:00:00Z`);
  let count = 0;

  while (cursor <= lastDay) {
    const dateKey = cursor.toISOString().slice(0, 10);
    if (isScheduledWorkday(dateKey) && !holidays.has(dateKey)) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}
