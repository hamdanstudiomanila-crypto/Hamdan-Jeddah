"use client";

import EmployeeWorkClock from './EmployeeWorkClock';
import Spinner from '@/components/Spinner';
import { T } from '@/components/language/LanguageProvider';
import type { AttendanceLog } from '@/lib/employee/attendance';

type Props = {
  todayLog: AttendanceLog | null;
  attendanceRecordingEnabled: boolean;
  loading: boolean;
  timeOutLoading: boolean;
  initLoading: boolean;
  checkingNetwork: boolean;
  officeNetworkAllowed: boolean | null;
  officeNetworkIssue: 'outside' | 'unavailable' | null;
  holidays: string[];
  startHour: number;
  startMinute: number;
  workEndHour: number;
  workEndMinute: number;
  handleTimeIn: () => void;
  handleTimeOutClick: () => void;
  checkOfficeNetwork: () => void;
};

export default function AttendanceSection({ todayLog, attendanceRecordingEnabled, loading, timeOutLoading, initLoading, checkingNetwork, officeNetworkAllowed, officeNetworkIssue, holidays, startHour, startMinute, workEndHour, workEndMinute, handleTimeIn, handleTimeOutClick, checkOfficeNetwork }: Props) {
  return <>
            {!attendanceRecordingEnabled ? <div role="status" className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:!text-white"><T>{"Attendance recording is temporarily unavailable."}</T></div> : null}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <EmployeeWorkClock todayLog={todayLog} holidays={holidays} startHour={startHour} startMinute={startMinute} endHour={workEndHour} endMinute={workEndMinute} />
              <div className="flex flex-col justify-center gap-2 sm:min-h-40">
                {!todayLog ? (
                  <button onClick={handleTimeIn} disabled={!attendanceRecordingEnabled || loading || initLoading || checkingNetwork || officeNetworkAllowed === false} className="btn-primary !py-3">
                    <T>{loading ? <span className="flex items-center justify-center gap-2"><Spinner size="sm"/><T>{"Processing..."}</T></span> : checkingNetwork ? <span className="flex items-center justify-center gap-2"><Spinner size="sm"/><T>{"Checking..."}</T></span> : officeNetworkAllowed === false ? (officeNetworkIssue === 'unavailable' ? 'Attendance Unavailable' : 'Not on Office Network') : 'Time In'}</T>
                  </button>
                ) : !todayLog.time_out ? (
                  <button onClick={handleTimeOutClick} disabled={!attendanceRecordingEnabled || timeOutLoading || checkingNetwork || officeNetworkAllowed === false} className="btn-danger !py-3">
                    <T>{timeOutLoading ? <span className="flex items-center justify-center gap-2"><Spinner size="sm"/><T>{"Processing..."}</T></span> : checkingNetwork ? <span className="flex items-center justify-center gap-2"><Spinner size="sm"/><T>{"Checking..."}</T></span> : officeNetworkAllowed === false ? (officeNetworkIssue === 'unavailable' ? 'Attendance Unavailable' : 'Not on Office Network') : 'Time Out'}</T>
                  </button>
                ) : (
                  <button disabled className="btn-primary !py-3 opacity-50 cursor-not-allowed"><T>{"Completed for Today"}</T></button>
                )}
                <div className="flex min-h-6 flex-col justify-center">
                {todayLog?.time_in && (
                  <p className="text-center text-slate-400 text-xs"><T>{" In: "}</T>{new Date(todayLog.time_in).toLocaleTimeString('en-US', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    {todayLog.time_out && <><T>{" · Out: "}</T>{new Date(todayLog.time_out).toLocaleTimeString('en-US', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</>}
                  </p>
                )}
                {!checkingNetwork && officeNetworkAllowed === false && !(todayLog?.time_out) && (
                  <div className={`flex items-start justify-between gap-3 rounded-xl border p-3 ${officeNetworkIssue === 'unavailable' ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold ${officeNetworkIssue === 'unavailable' ? 'text-red-700' : 'text-orange-700'}`}>
                        <T>{officeNetworkIssue === 'unavailable' ? 'Attendance recording is temporarily unavailable.' : 'You are not connected to an authorized office network.'}</T>
                      </p>
                      <p className="text-slate-500 text-[10px] mt-1">
                        <T>{officeNetworkIssue === 'unavailable'
                          ? 'Please contact HR or IT. You can still use the rest of the Employee Portal.'
                          : 'Time In and Time Out are available only through the office network. Other portal features remain available.'}</T>
                      </p>
                    </div>
                    <button onClick={checkOfficeNetwork} className="text-blue-600 text-xs font-bold hover:underline flex-shrink-0"><T>{"Retry"}</T></button>
                  </div>
                )}
                </div>
              </div>
            </div>

  </>;
}
