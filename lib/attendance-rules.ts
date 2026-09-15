import { isScheduledWorkday, workDate, WORK_SCHEDULE_EFFECTIVE_DATE, WORK_TIME_ZONE } from './work-schedule';

export type AttendanceStatus = 'Present' | 'Late';

// Compare complete instants so next-day time-outs are not mistaken for early exits.
export function isEarlyOut(logDate: string, timeOut: string | null | undefined, endHour: number, endMinute = 0): boolean {
  if (!timeOut || !/^\d{4}-\d{2}-\d{2}$/.test(logDate)) return false;
  if (!Number.isInteger(endHour) || endHour < 0 || endHour > 23 || !Number.isInteger(endMinute) || endMinute < 0 || endMinute > 59) return false;
  const end = logDate < WORK_SCHEDULE_EFFECTIVE_DATE ? '19:00' : `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
  const actual = Date.parse(timeOut);
  const expected = Date.parse(`${logDate}T${end}:00+03:00`);
  return Number.isFinite(actual) && actual >= Date.parse(`${logDate}T00:00:00+03:00`) && actual < expected;
}

export function computeAttendanceStatus(hour: number, minute: number, cutoffHour: number, cutoffMinute: number): AttendanceStatus {
  return hour > cutoffHour || (hour === cutoffHour && minute > cutoffMinute) ? 'Late' : 'Present';
}

export function attendanceTiming(iso: string, cutoffHour: number, cutoffMinute: number) {
  const date = workDate(new Date(iso));
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: WORK_TIME_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value ?? 0);
  const cutoff = date < WORK_SCHEDULE_EFFECTIVE_DATE ? 9 * 60 + 15 : cutoffHour * 60 + cutoffMinute;
  const elapsedSeconds = (value('hour') * 60 + value('minute') - cutoff) * 60 + (date < WORK_SCHEDULE_EFFECTIVE_DATE ? 0 : value('second') + new Date(iso).getUTCMilliseconds() / 1000);
  const late = isScheduledWorkday(date) && elapsedSeconds > 0;
  return { status: late ? 'Late' as const : 'Present' as const, minutesLate: late ? Math.ceil(elapsedSeconds / 60) : 0 };
}
