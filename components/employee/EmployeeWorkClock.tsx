'use client';
import { T, useLanguage } from '@/components/language/LanguageProvider';


import { memo, useEffect, useState } from 'react';
import { isWorkingDate, workDate } from '@/lib/work-schedule';
import { isEarlyOut } from '@/lib/attendance-rules';
import { Clock3 } from 'lucide-react';

type TodayLog = {
  time_out: string | null;
  status: string | null;
} | null;

function getJeddahClock(locale: string) {
  const now = new Date();
  return {
    dateKey: workDate(now),
    time: now.toLocaleTimeString(locale, {
      timeZone: 'Asia/Riyadh',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
    date: now.toLocaleDateString(locale, {
      timeZone: 'Asia/Riyadh',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };
}

function EmployeeWorkClock({ todayLog, holidays = [], startHour = 8, startMinute = 0, endHour = 18, endMinute = 0 }: { todayLog: TodayLog; holidays?: string[]; startHour?: number; startMinute?: number; endHour?: number; endMinute?: number }) {
  const { language } = useLanguage();
  const locale = language === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US';
  const formatHour = (hour: number, minute: number) => new Date(Date.UTC(2026, 0, 1, hour, minute)).toLocaleTimeString(locale, { timeZone: 'UTC', hour: 'numeric', minute: '2-digit', hour12: true });
  const [clock, setClock] = useState(() => ({ time: '--:--:--', date: '', dateKey: '' }));

  useEffect(() => {
    const updateClock = () => setClock(getJeddahClock(locale));
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, [locale]);

  const restDay = Boolean(clock.dateKey) && !isWorkingDate(clock.dateKey, holidays);
  const isTodayLate = todayLog?.status?.toLowerCase() === 'late';
  const todayWorkStatus = !todayLog
    ? { label: restDay ? 'Non-working day' : 'No Time In', color: restDay ? 'bg-slate-100 text-slate-700' : 'bg-red-100 text-red-700' }
    : isEarlyOut(clock.dateKey, todayLog.time_out, endHour, endMinute)
      ? { label: isTodayLate ? 'Late / Early Out' : 'Early Out', color: 'bg-amber-100 text-amber-800' }
    : isTodayLate
      ? { label: todayLog.time_out ? 'Completed · Late' : 'Working · Late', color: 'bg-orange-100 text-orange-700' }
      : { label: todayLog.time_out ? 'Completed' : 'Working', color: 'bg-green-100 text-green-700' };

  const workClockTone = !todayLog && !restDay
    ? {
        panel: 'from-rose-500 to-red-700',
        border: 'border-red-200 dark:border-red-900/60',
        rail: 'from-rose-400 via-red-500 to-red-700',
      }
    : isTodayLate
      ? {
          panel: 'from-amber-400 to-orange-600',
          border: 'border-orange-200 dark:border-orange-900/60',
          rail: 'from-amber-300 via-orange-500 to-red-500',
        }
      : {
          panel: 'from-emerald-500 to-green-700',
          border: 'border-emerald-200 dark:border-emerald-900/60',
          rail: 'from-emerald-400 via-green-500 to-teal-600',
        };

  return (
    <div className={`relative flex min-h-40 overflow-hidden rounded-3xl border bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:bg-[#292f2b] ${workClockTone.border}`}>
      <div className={`relative flex w-[34%] min-w-28 flex-col items-center justify-center overflow-hidden bg-gradient-to-br px-3 py-5 text-center text-white transition-colors duration-300 ${workClockTone.panel}`}>
        <span className="absolute -start-7 -top-8 h-20 w-20 rounded-full border-[14px] border-white/10" aria-hidden="true" />
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/25">
          <Clock3 aria-hidden="true" size={21} strokeWidth={2.2} />
        </span>
        <p className="mt-3 text-[9px] font-black uppercase tracking-[0.18em] text-white/75"><T>{"Work clock"}</T></p>
        <span className={`mt-2 rounded-full px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-wide shadow-sm ${todayWorkStatus.color}`}>
          <T>{todayWorkStatus.label}</T>
        </span>
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col justify-center px-4 py-5 text-start sm:px-5">
        <span className={`absolute end-0 top-0 h-full w-1 bg-gradient-to-b transition-colors duration-300 ${workClockTone.rail}`} aria-hidden="true" />
        <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400"><T>{"Jeddah time"}</T></p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 font-mono font-black leading-none tabular-nums text-slate-950 dark:text-white">
          <span className="text-[clamp(2rem,8vw,3rem)] tracking-[-0.08em]">{clock.time.split(' ')[0]}</span>
          <span className="text-2xl tracking-normal sm:text-3xl">{clock.time.split(' ')[1]}</span>
        </p>
        <div className="mt-3 border-t border-dashed border-slate-200 pt-2 dark:border-slate-700">
          <p className="truncate text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-300">{clock.date}</p>
          <p className="mt-2 text-[10px] font-semibold text-slate-500 dark:text-slate-300"><T>{"Sun to Thu: "}</T>{formatHour(startHour, startMinute)}<T>{" to "}</T>{formatHour(endHour, endMinute)}<br /><T>{"Friday & Saturday: Rest days"}</T></p>
        </div>
      </div>
    </div>
  );
}

export default memo(EmployeeWorkClock);
