import { supabase } from '@/lib/supabase';

export type AttendanceLog = {
  id: string;
  log_date: string;
  time_in: string | null;
  time_out: string | null;
  status: string | null;
};

export async function fetchAttendanceHistory(userId: string): Promise<AttendanceLog[]> {
  const { data, error } = await supabase.from('attendance_logs')
    .select('id, log_date, time_in, time_out, status')
    .eq('user_id', userId).order('log_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function recordAttendance(action: 'time-in' | 'time-out'): Promise<{ status?: string }> {
  const response = await fetch(`/api/${action}`, { method: 'POST' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Failed to record ${action}.`);
  return result;
}
