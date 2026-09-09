import { describe, expect, it } from 'vitest';
import { attendanceTiming } from '@/lib/attendance-rules';
import { countChargeableLeaveDays } from '@/lib/leave-rules';
import { isScheduledWorkday, workDate } from '@/lib/work-schedule';
import { periodDates } from '@/lib/employee/ask-ai';

describe('Jeddah work schedule effective September 1, 2026', () => {
  it('counts Sunday through Thursday and excludes both rest days', () => {
    expect(countChargeableLeaveDays('2026-09-13', '2026-09-19')).toBe(5);
    expect(countChargeableLeaveDays('2026-09-11', '2026-09-12')).toBe(0);
    expect(isScheduledWorkday('2026-09-13')).toBe(true);
    expect(countChargeableLeaveDays('2026-09-13', '2026-09-17', ['2026-09-14'])).toBe(4);
  });
  it('preserves the historical workweek across the effective date', () => {
    expect(isScheduledWorkday('2026-08-28')).toBe(true);
    expect(isScheduledWorkday('2026-08-30')).toBe(false);
    expect(isScheduledWorkday('2026-09-04')).toBe(false);
    expect(isScheduledWorkday('2026-09-06')).toBe(true);
    expect(countChargeableLeaveDays('2026-09-04', '2026-09-13')).toBe(6);
  });
  it('uses the Jeddah day at the UTC midnight boundary', () => {
    expect(workDate(new Date('2026-09-12T20:59:59Z'))).toBe('2026-09-12');
    expect(workDate(new Date('2026-09-12T21:00:00Z'))).toBe('2026-09-13');
    expect(periodDates('current_year', new Date('2026-12-31T20:59:59Z')).year).toBe(2026);
    expect(periodDates('current_year', new Date('2026-12-31T21:00:00Z')).year).toBe(2027);
  });
  it('allows 8 AM exactly, with no grace period after it', () => {
    expect(attendanceTiming('2026-09-13T05:00:00Z', 8, 0)).toEqual({ status: 'Present', minutesLate: 0 });
    expect(attendanceTiming('2026-09-13T05:00:01Z', 8, 0)).toEqual({ status: 'Late', minutesLate: 1 });
    expect(attendanceTiming('2026-09-13T05:15:00Z', 8, 0)).toEqual({ status: 'Late', minutesLate: 15 });
  });
  it('does not label optional rest-day time-in late', () => {
    expect(attendanceTiming('2026-09-11T09:00:00Z', 8, 0).status).toBe('Present');
    expect(attendanceTiming('2026-09-12T09:00:00Z', 8, 0).status).toBe('Present');
  });
  it('preserves the historical cutoff and rejects invalid leave ranges', () => {
    expect(attendanceTiming('2026-08-31T06:15:30Z', 8, 0).status).toBe('Present');
    expect(attendanceTiming('2026-08-31T06:16:00Z', 8, 0).status).toBe('Late');
    expect(countChargeableLeaveDays('', '')).toBe(0);
    expect(countChargeableLeaveDays('2026-09-14', '2026-09-13')).toBe(0);
  });
});
