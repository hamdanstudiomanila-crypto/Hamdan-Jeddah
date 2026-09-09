'use client';
import { T, useLanguage } from '@/components/language/LanguageProvider';


import Spinner from '@/components/Spinner';
import ModalShell from '@/components/shared/ModalShell';

type Props = { open: boolean; onClose: () => void; backupLoading: boolean; backupResult: { type: 'success' | 'error'; text: string } | null; handleBackupDatabase: () => void | Promise<void> };

export default function DatabaseBackupModal({ open, onClose, backupLoading, backupResult, handleBackupDatabase }: Props) {
  const { t: localize } = useLanguage();
  return <ModalShell open={open} onClose={onClose} title={localize("Database Backup")} icon="🗄️" size="sm" closeDisabled={backupLoading}>
    <p className="mb-6 text-sm text-slate-400"><T>{"Runs a full backup (schema + all data, including the auth schema) of the production Supabase database and emails you the .sql file once it completes -- a genuine off-site copy, separate from the server this app runs on."}</T></p>
    <button type="button" onClick={handleBackupDatabase} disabled={backupLoading} className="w-full btn-primary disabled:opacity-50"><T>{backupLoading ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" /><T>{"Starting Backup..."}</T></span> : 'Backup Database'}</T></button>
    {backupResult && <p role="status" className={`mt-3 text-sm font-medium ${backupResult.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{backupResult.type === 'error' ? `⚠️ ${backupResult.text}` : `✅ ${backupResult.text}`}</p>}
    <button type="button" onClick={onClose} className="mt-4 w-full rounded-full bg-slate-100 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-200"><T>{"Close"}</T></button>
  </ModalShell>;
}
