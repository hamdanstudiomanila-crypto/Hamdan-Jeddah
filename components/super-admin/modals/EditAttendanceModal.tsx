'use client';
import { T, useLanguage } from '@/components/language/LanguageProvider';


import type { Dispatch, SetStateAction } from 'react';
import Spinner from '@/components/Spinner';
import ModalShell from '@/components/shared/ModalShell';

type EditingLog = { id: string; employeeName: string; timeInLocal: string; timeOutLocal: string; status: string };
type Props = { editingLog: EditingLog | null; logSaving: boolean; saveEditLog: () => void | Promise<void>; setEditingLog: Dispatch<SetStateAction<EditingLog | null>> };

export default function EditAttendanceModal({ editingLog, logSaving, saveEditLog, setEditingLog }: Props) {
  const { t: localize } = useLanguage();
  if (!editingLog) return null;
  return (
    <ModalShell open onClose={() => setEditingLog(null)} title={localize("Edit Attendance")} description={editingLog.employeeName} size="sm" closeDisabled={logSaving} footer={<div className="flex gap-3"><button type="button" className="flex-1 rounded-full bg-slate-100 p-3 text-sm font-medium" onClick={() => setEditingLog(null)}><T>{"Cancel"}</T></button><button type="button" className="flex-1 btn-primary disabled:opacity-50" onClick={saveEditLog} disabled={logSaving || !editingLog.timeInLocal}><T>{logSaving ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /><T>{"Saving..."}</T></span> : 'Save'}</T></button></div>}>
            <label className="label-branded"><T>{"Time In (Jeddah Time)"}</T></label>
            <input
              type="datetime-local"
              className="input-field mb-4"
              value={editingLog.timeInLocal}
              onChange={(e) =>
                setEditingLog({ ...editingLog, timeInLocal: e.target.value })
              }
            />

            <label className="label-branded"><T>{"Time Out (Jeddah Time)"}</T></label>
            <input
              type="datetime-local"
              className="input-field mb-1"
              value={editingLog.timeOutLocal}
              onChange={(e) =>
                setEditingLog({ ...editingLog, timeOutLocal: e.target.value })
              }
            />
            {editingLog.timeOutLocal && (
              <button
                type="button"
                onClick={() => setEditingLog({ ...editingLog, timeOutLocal: '' })}
                className="text-slate-400 text-xs font-bold hover:text-slate-600 mb-4"
              ><T>{" Clear time out "}</T></button>
            )}
            {!editingLog.timeOutLocal && <div className="mb-4" />}

            <label className="label-branded"><T>{"Status"}</T></label>
            <select
              className="input-field mb-6"
              value={editingLog.status}
              onChange={(e) =>
                setEditingLog({ ...editingLog, status: e.target.value })
              }
            >
              <option value="Present"><T>{"Present"}</T></option>
              <option value="Late"><T>{"Late"}</T></option>
              <option value="Excused"><T>{"Excused"}</T></option>
              <option value="Absent"><T>{"Absent"}</T></option>
              <option value="Sick Leave"><T>{"Sick Leave"}</T></option>
              <option value="Vacation Leave"><T>{"Vacation Leave"}</T></option>
              <option value="Emergency Leave"><T>{"Emergency Leave"}</T></option>
            </select>

    </ModalShell>
  );
}
