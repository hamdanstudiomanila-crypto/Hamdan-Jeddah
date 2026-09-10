"use client";

import { useState } from 'react';
import { workDate } from '@/lib/work-schedule';
import { fetchAttendanceHistory, recordAttendance, type AttendanceLog } from '@/lib/employee/attendance';

type Options = {
  attendanceRecordingEnabled: boolean;
  setMessage: (message: string) => void;
  onRecorded: () => Promise<void>;
  onTimeOutRecorded: () => void;
};

/** Owns attendance state and I/O; dashboard composition and modal routing stay in the page. */
export function useAttendance({ attendanceRecordingEnabled, setMessage, onRecorded, onTimeOutRecorded }: Options) {
  const [loading, setLoading] = useState(false);
  const [timeOutLoading, setTimeOutLoading] = useState(false);
  const [history, setHistory] = useState<AttendanceLog[]>([]);
  const [todayLog, setTodayLog] = useState<AttendanceLog | null>(null);

  const loadAttendance = async (userId: string) => {
    try {
      const rows = await fetchAttendanceHistory(userId);
      setHistory(rows);
      setTodayLog(rows.find(log => log.log_date === workDate()) ?? null);
    } catch (error: unknown) {
      setHistory([]);
      setTodayLog(null);
      setMessage('Error: ' + (error instanceof Error ? error.message : 'Unable to load attendance history.'));
    }
  };

  const [officeNetworkAllowed, setOfficeNetworkAllowed] = useState<boolean | null>(null);
  const [checkingNetwork, setCheckingNetwork] = useState(true);
  const [officeNetworkIssue, setOfficeNetworkIssue] = useState<'outside' | 'unavailable' | null>(null);

  const checkOfficeNetwork = async () => {
    setCheckingNetwork(true);
    setOfficeNetworkIssue(null);
    try {
      const res = await fetch('/api/check-office-network', { cache: 'no-store' });
      const result = await res.json();
      if (result.allowed) {
        setOfficeNetworkAllowed(true);
        setOfficeNetworkIssue(null);
      } else {
        setOfficeNetworkAllowed(false);
        setOfficeNetworkIssue(
          result.code === 'ATTENDANCE_NETWORK_UNAVAILABLE' || res.status === 503
            ? 'unavailable'
            : 'outside'
        );
      }
    } catch (err) {
      console.error('Error checking office network:', err);
      // Fail closed when the network cannot be verified. Only attendance
      // recording is disabled; the rest of the employee portal stays usable.
      setOfficeNetworkAllowed(false);
      setOfficeNetworkIssue('unavailable');
    } finally {
      setCheckingNetwork(false);
    }
  };

  const handleTimeIn = async () => {
    if (!attendanceRecordingEnabled) { setMessage('Error: Attendance recording is temporarily unavailable.'); return; }
    setLoading(true);
    setMessage('');
    try {
      const result = await recordAttendance('time-in');

      setMessage(
        result.status === 'Late'
          ? 'Time in recorded, but you are marked as late today.'
          : 'Success! Attendance recorded.'
      );
      await onRecorded();
    } catch (err: unknown) {
      setMessage("Error: " + (err instanceof Error ? err.message : "Unable to record attendance."));
    } finally {
      setLoading(false);
    }
  };

  const handleTimeOut = async () => {
    setTimeOutLoading(true);
    setMessage('');
    try {
      await recordAttendance('time-out');

      setMessage('Time out recorded. See you tomorrow!');
      onTimeOutRecorded();
      await onRecorded();
    } catch (err: unknown) {
      setMessage("Error: " + (err instanceof Error ? err.message : "Unable to record attendance."));
    } finally {
      setTimeOutLoading(false);
    }
  };

  return { history, todayLog, loading, timeOutLoading, loadAttendance, handleTimeIn, handleTimeOut, officeNetworkAllowed, officeNetworkIssue, checkingNetwork, checkOfficeNetwork };
}
