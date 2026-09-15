import { describe, expect, it } from 'vitest';
import { isEarlyOut } from '../lib/attendance-rules';

describe('early out label', () => {
 it('compares against Jeddah official out with no grace period', () => {
  expect(isEarlyOut('2026-09-15', '2026-09-15T14:59:59Z', 18)).toBe(true);
  expect(isEarlyOut('2026-09-15', '2026-09-15T15:00:00Z', 18)).toBe(false);
  expect(isEarlyOut('2026-09-15', '2026-09-16T01:00:00Z', 18)).toBe(false);
 });
 it('uses configured minutes and the historical 7 PM schedule', () => {
  expect(isEarlyOut('2026-09-15', '2026-09-15T15:10:00Z', 18, 30)).toBe(true);
  expect(isEarlyOut('2026-08-31', '2026-08-31T15:30:00Z', 18)).toBe(true);
 });
 it('does not label missing or invalid time-outs', () => {
  expect(isEarlyOut('2026-09-15', null, 18)).toBe(false);
  expect(isEarlyOut('2026-09-15', 'invalid', 18)).toBe(false);
 });
});
