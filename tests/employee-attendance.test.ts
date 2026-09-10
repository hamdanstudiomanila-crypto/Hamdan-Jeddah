import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const database = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: database }));
import { fetchAttendanceHistory, recordAttendance } from '@/lib/employee/attendance';
import AttendanceSection from '@/components/employee/AttendanceSection';

beforeEach(() => {
  vi.clearAllMocks();
  database.from.mockReturnValue(database);
  database.select.mockReturnValue(database);
  database.eq.mockReturnValue(database);
});
afterEach(() => vi.unstubAllGlobals());

describe('employee attendance boundary', () => {
  it('loads only the requested employee history and keeps nullable clock fields', async () => {
    const rows = [{ id: 'log', log_date: '2026-09-10', time_in: null, time_out: null, status: 'Absent' }];
    database.order.mockResolvedValue({ data: rows, error: null });
    expect(await fetchAttendanceHistory('employee-a')).toEqual(rows);
    expect(database.eq).toHaveBeenCalledWith('user_id', 'employee-a');
    expect(database.order).toHaveBeenCalledWith('log_date', { ascending: false });
  });
  it('surfaces history failures instead of treating them as a successful empty history', async () => {
    database.order.mockResolvedValue({ data: null, error: { message: 'Access denied' } });
    await expect(fetchAttendanceHistory('employee-a')).rejects.toThrow('Access denied');
  });
  it('records through the server endpoint without a client-supplied timestamp or user ID', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ status: 'Late' }));
    vi.stubGlobal('fetch', fetcher);
    expect(await recordAttendance('time-in')).toEqual({ status: 'Late' });
    expect(fetcher).toHaveBeenCalledWith('/api/time-in', { method: 'POST' });
  });
  it('preserves the server network rejection message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Outside office network' }, { status: 403 })));
    await expect(recordAttendance('time-out')).rejects.toThrow('Outside office network');
  });
  it('provides an action-specific fallback when the server omits the error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({}, { status: 500 })));
    await expect(recordAttendance('time-out')).rejects.toThrow('Failed to record time-out.');
  });
});

const props = { todayLog: null, attendanceRecordingEnabled: true, loading: false, timeOutLoading: false, initLoading: false, checkingNetwork: false, officeNetworkAllowed: true, officeNetworkIssue: null, holidays: [], startHour: 8, startMinute: 0, workEndHour: 18, workEndMinute: 0, handleTimeIn: () => {}, handleTimeOutClick: () => {}, checkOfficeNetwork: () => {} };
describe('attendance section states', () => {
  it('offers time-in and preserves the configured Jeddah schedule', () => {
    const html = renderToStaticMarkup(createElement(AttendanceSection, props));
    expect(html).toContain('Time In');
    expect(html).toContain('8:00 AM');
    expect(html).toContain('6:00 PM');
  });
  it('disables recording and explains network unavailability', () => {
    const html = renderToStaticMarkup(createElement(AttendanceSection, { ...props, officeNetworkAllowed: false, officeNetworkIssue: 'unavailable' }));
    expect(html).toContain('disabled');
    expect(html).toContain('Attendance Unavailable');
    expect(html).toContain('Retry');
  });
  it('shows completion instead of allowing another clock action', () => {
    const html = renderToStaticMarkup(createElement(AttendanceSection, { ...props, todayLog: { id: 'log', log_date: '2026-09-10', time_in: '2026-09-10T05:00:00Z', time_out: '2026-09-10T15:00:00Z', status: 'Present' } }));
    expect(html).toContain('Completed for Today');
    expect(html).toContain('disabled');
  });
});
