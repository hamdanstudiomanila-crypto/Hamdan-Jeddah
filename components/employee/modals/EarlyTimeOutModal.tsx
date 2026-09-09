'use client';
import { T, useLanguage } from '@/components/language/LanguageProvider';


import Spinner from '@/components/Spinner';
import ModalShell from '@/components/shared/ModalShell';

type Props = { open: boolean; onClose: () => void; expectedTimeOutLabel: string; handleTimeOut: () => void | Promise<void>; timeOutLoading: boolean };

export default function EarlyTimeOutModal({ open, onClose, expectedTimeOutLabel, handleTimeOut, timeOutLoading }: Props) {
  const { t: localize } = useLanguage();
  return <ModalShell open={open} onClose={onClose} title={localize("Time Out Early?")} icon="⚠️" size="sm" closeDisabled={timeOutLoading} footer={<div className="flex gap-3"><button type="button" className="flex-1 rounded-full bg-slate-100 p-3 text-sm font-medium hover:bg-slate-200" onClick={onClose}><T>{"Cancel"}</T></button><button type="button" className="flex-1 btn-danger" onClick={() => { onClose(); void handleTimeOut(); }} disabled={timeOutLoading}><T>{timeOutLoading ? <span className="flex items-center justify-center gap-2"><Spinner size="sm"/><T>{"Processing..."}</T></span> : 'Yes, Time Out'}</T></button></div>}>
    <p className="text-sm text-slate-500"><T>{"It's not yet "}</T>{expectedTimeOutLabel}<T>{". Are you sure you want to time out now?"}</T><span className="mt-1 block text-xs text-slate-400"><T>{"Current time: "}</T>{new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', hour12: true })}<T>{" (Jeddah Time)"}</T></span></p>
  </ModalShell>;
}
