import { describe, expect, it, vi, afterEach } from 'vitest';
import { countChargeableLeaveDays, validateLeaveDateRange } from '../lib/leave-rules';

afterEach(() => vi.useRealTimers());

describe('Jeddah leave filing', () => {
  it.each(['2025-12-31', '2026-09-13', '2026-09-15', '2026-09-20'])('accepts past, current, and future dates: %s', date => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-15T09:00:00+03:00'));
    expect(validateLeaveDateRange(date, date)).toBeNull();
  });

  it('still requires both dates in chronological order', () => {
    expect(validateLeaveDateRange('', '2026-09-13')).toBeTruthy();
    expect(validateLeaveDateRange('2026-09-13', '')).toBeTruthy();
    expect(validateLeaveDateRange('2026-09-14', '2026-09-13')).toBe('End date cannot be before start date.');
  });

  it('counts retroactive Sunday leave and excludes Jeddah rest days and holidays', () => {
    expect(countChargeableLeaveDays('2026-09-13', '2026-09-13')).toBe(1);
    expect(countChargeableLeaveDays('2026-09-11', '2026-09-13')).toBe(1);
    expect(countChargeableLeaveDays('2026-09-11', '2026-09-13', ['2026-09-13'])).toBe(0);
  });
});
