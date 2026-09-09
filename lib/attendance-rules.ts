import { isScheduledWorkday, workDate, WORK_SCHEDULE_EFFECTIVE_DATE, WORK_TIME_ZONE } from './work-schedule';

export type AttendanceStatus = 'Present' | 'Late';

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
