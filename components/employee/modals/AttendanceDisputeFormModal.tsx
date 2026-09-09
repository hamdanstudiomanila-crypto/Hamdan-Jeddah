'use client';
import { T, useLanguage } from '@/components/language/LanguageProvider';


import type { Dispatch, RefObject, SetStateAction } from 'react';
import Spinner from '@/components/Spinner';
import ModalShell from '@/components/shared/ModalShell';

type DisputeType = 'TimeIn' | 'TimeOut';
type Step = 'choice' | 'form' | 'confirm';
type Form = { attendanceLogId: string | null; date: string; timeLocal: string; reason: string; type: DisputeType };
type Eligibility = { timeIn: { eligible: boolean; reason: string }; timeOut: { eligible: boolean; reason: string } };
type Props = { open: boolean; onClose: () => void; disputeChoiceEligibility: Eligibility; disputeForm: Form; disputeMsg: { type: 'success' | 'error'; text: string } | null; disputeSaving: boolean; disputeStep: Step; disputeTypeLocked: RefObject<boolean>; formatTimeLocal: (value: string) => string; handleDisputeDateChange: (value: string) => void; proceedToDisputeConfirm: () => void; selectDisputeType: (type: DisputeType) => void; setDisputeForm: Dispatch<SetStateAction<Form>>; setDisputeStep: Dispatch<SetStateAction<Step>>; submitDispute: () => void | Promise<void> };

export default function AttendanceDisputeFormModal({ open, onClose, disputeChoiceEligibility, disputeForm, disputeMsg, disputeSaving, disputeStep, disputeTypeLocked, formatTimeLocal, handleDisputeDateChange, proceedToDisputeConfirm, selectDisputeType, setDisputeForm, setDisputeStep, submitDispute }: Props) {
  const { t: localize } = useLanguage();
  return (
    <ModalShell open={open} onClose={onClose} title={localize(disputeStep === 'choice' ? 'File a Dispute' : disputeStep === 'confirm' ? 'Confirm Dispute' : `${disputeForm.type === 'TimeOut' ? 'Time Out' : 'Time In'} Dispute`)} size="sm" closeDisabled={disputeSaving}>
            {disputeStep === 'choice' ? (
              <>
                {/* ── STEP 1: CHOOSE DISPUTE TYPE ── */}
                <h3 className="mb-2"><T>{"File a Dispute"}</T></h3>
                <p className="text-sm text-slate-400 mb-6"><T>{" What would you like to report? "}</T></p>

                {disputeMsg && (
                  <div className={`p-3 rounded-xl text-sm font-bold mb-4 ${disputeMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {disputeMsg.text}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => disputeChoiceEligibility.timeIn.eligible && selectDisputeType('TimeIn')}
                    disabled={!disputeChoiceEligibility.timeIn.eligible}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50 transition text-start ${
                      disputeChoiceEligibility.timeIn.eligible ? 'hover:bg-slate-100' : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-lg">🕗</div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm"><T>{"Time In Dispute"}</T></p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        <T>{disputeChoiceEligibility.timeIn.eligible
                          ? 'Forgot to time in, or tagged Late by mistake'
                          : disputeChoiceEligibility.timeIn.reason}</T>
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => disputeChoiceEligibility.timeOut.eligible && selectDisputeType('TimeOut')}
                    disabled={!disputeChoiceEligibility.timeOut.eligible}
                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50 transition text-start ${
                      disputeChoiceEligibility.timeOut.eligible ? 'hover:bg-slate-100' : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 text-lg">🕕</div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm"><T>{"Time Out Dispute"}</T></p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        <T>{disputeChoiceEligibility.timeOut.eligible
                          ? 'Forgot to time out before leaving'
                          : disputeChoiceEligibility.timeOut.reason}</T>
                      </p>
                    </div>
                  </button>
                </div>

                <button
                  type="button"
                  className="w-full mt-6 p-3 bg-slate-100 rounded-full font-medium text-sm"
                    onClick={onClose}
                ><T>{" Cancel "}</T></button>
              </>
            ) : disputeStep === 'form' ? (
              <>
                {/* ── STEP 2: FILL IN DETAILS ── */}
                <h3 className="mb-2">
                  <T>{disputeForm.type === 'TimeOut'
                    ? 'Report Missed Time-Out'
                    : disputeForm.attendanceLogId ? 'Dispute Late Tag' : 'Report Missed Time-In'}</T>
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  <T>{disputeForm.type === 'TimeOut'
                    ? "Forgot to time out that day? Tell us what time you actually left, and HR will review it."
                    : disputeForm.attendanceLogId
                      ? "Tell us what time you actually arrived, and HR will review it."
                      : "Forgot to time in on a previous day? Let us know when you actually arrived."}</T>
                </p>

                {disputeMsg && (
                  <div className={`p-3 rounded-xl text-sm font-bold mb-4 ${disputeMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {disputeMsg.text}
                  </div>
                )}

                {!disputeTypeLocked.current && (
                  <div className="flex items-center justify-between gap-2 mb-4 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-600">
                      <T>{disputeForm.type === 'TimeOut' ? '🕕 Time Out Dispute' : '🕗 Time In Dispute'}</T>
                    </span>
                    <button
                      type="button"
                      onClick={() => setDisputeStep('choice')}
                      className="text-blue-600 text-xs font-bold hover:underline"
                    ><T>{" Change "}</T></button>
                  </div>
                )}

                <label className="label-branded"><T>{"Date"}</T></label>
                <input
                  type="date"
                  className="input-field mb-1"
                  value={disputeForm.date}
                  onChange={(e) => handleDisputeDateChange(e.target.value)}
                  disabled={disputeTypeLocked.current && !!disputeForm.attendanceLogId}
                  max={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date())}
                />
                {!disputeTypeLocked.current && disputeForm.type === 'TimeOut' && disputeForm.date && !disputeForm.attendanceLogId && (
                  <p className="text-orange-600 text-[11px] font-medium mb-3 ms-1"><T>{"⚠️ No time-in recorded on that date yet — you can't dispute a time-out without one."}</T></p>
                )}
                <div className="mb-3" />

                <label className="label-branded"><T>{disputeForm.type === 'TimeOut' ? 'Time You Actually Left (Jeddah Time)' : 'Time You Actually Arrived (Jeddah Time)'}</T></label>
                <input
                  type="time"
                  className="input-field mb-4"
                  value={disputeForm.timeLocal}
                  onChange={(e) => setDisputeForm({ ...disputeForm, timeLocal: e.target.value })}
                />

                <label className="label-branded"><T>{"Reason (optional)"}</T></label>
                <textarea
                  className="input-field mb-6 min-h-[80px] resize-y"
                  value={disputeForm.reason}
                  onChange={(e) => setDisputeForm({ ...disputeForm, reason: e.target.value })}
                  placeholder={localize(disputeForm.type === 'TimeOut' ? 'e.g. I forgot to time out before leaving.' : 'e.g. I forgot to time in when I arrived.')}
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    className="flex-1 p-3 bg-slate-100 rounded-full font-medium text-sm"
                    onClick={() => {
                      if (!disputeTypeLocked.current) {
                        setDisputeStep('choice');
                      } else {
                      onClose();
                      }
                    }}
                  >
                    <T>{disputeTypeLocked.current ? 'Cancel' : '← Back'}</T>
                  </button>
                  <button
                    type="button"
                    className="flex-1 btn-primary disabled:opacity-50"
                    onClick={proceedToDisputeConfirm}
                    disabled={!disputeForm.date || !disputeForm.timeLocal}
                  ><T>{" Review Dispute "}</T></button>
                </div>
              </>
            ) : (
              <>
                {/* ── STEP 3: CONFIRMATION -- highlighted summary before actually submitting ── */}
                <h3 className="mb-2"><T>{"Confirm Your Dispute"}</T></h3>
                <p className="text-sm text-slate-400 mb-6"><T>{" Please review the details below before submitting. HR will see exactly this. "}</T></p>

                {disputeMsg && (
                  <div className={`p-3 rounded-xl text-sm font-bold mb-4 ${disputeMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {disputeMsg.text}
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="label-branded mb-0"><T>{"Dispute Type"}</T></span>
                    <span className="tag-excused">
                      <T>{disputeForm.type === 'TimeOut' ? 'Missed Time-Out' : disputeForm.attendanceLogId ? 'Late Tag' : 'Missed Time-In'}</T>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="label-branded mb-0"><T>{"Date"}</T></span>
                    <span className="font-bold text-slate-800 text-sm">{disputeForm.date}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="label-branded mb-0">
                      <T>{disputeForm.type === 'TimeOut' ? 'Time You Left' : 'Time You Arrived'}</T>
                    </span>
                    <span className="font-bold text-slate-800 text-sm tabular-nums">
                      {formatTimeLocal(disputeForm.timeLocal)}
                    </span>
                  </div>
                  {disputeForm.reason && (
                    <div>
                      <span className="label-branded block mb-1"><T>{"Reason"}</T></span>
                      <p className="text-slate-700 text-sm bg-white rounded-xl p-3 border border-blue-100">{disputeForm.reason}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    className="flex-1 p-3 bg-slate-100 rounded-full font-medium text-sm"
                    onClick={() => setDisputeStep('form')}
                    disabled={disputeSaving}
                  ><T>{" ← Back "}</T></button>
                  <button
                    type="button"
                    className="flex-1 btn-primary disabled:opacity-50"
                    onClick={submitDispute}
                    disabled={disputeSaving}
                  >
                    <T>{disputeSaving ? (
                      <span className="flex items-center justify-center gap-2">
                        <Spinner size="sm" /><T>{"Submitting..."}</T></span>
                    ) : 'Confirm & Submit'}</T>
                  </button>
                </div>
              </>
            )}
    </ModalShell>
  );
}
