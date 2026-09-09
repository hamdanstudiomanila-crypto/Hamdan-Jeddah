'use client';

// Mahalaga: Para hindi subukang i-prerender ng Next.js ang page na ito
export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { initializeRecoverySession } from '@/lib/password-recovery';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initializing = useRef(false);
  useEffect(() => {
    if (initializing.current) return;
    initializing.current = true;
    void initializeRecoverySession(supabase.auth, new URL(window.location.href))
      .then(() => {
        window.history.replaceState(null, '', window.location.pathname);
        setReady(true);
      })
      .catch((error: unknown) => setErrorMsg(error instanceof Error ? error.message : 'Unable to open the reset session. Please request a new reset link.'));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      await supabase.auth.signOut();
      router.replace('/auth/success-reset');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const passwordMismatch =
    newPassword.length > 0 && confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <section className="w-full max-w-md">
        <h1 className="text-xl font-bold mb-4">Reset Password</h1>

        {errorMsg && (
          <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm font-semibold">
            {errorMsg}
          </div>
        )}

        {!ready && !errorMsg ? (
          <div className="text-sm text-gray-600">Loading reset session…</div>
        ) : ready ? (
          <form onSubmit={onSubmit} className="space-y-3">
            <label htmlFor="new-password" className="block text-sm font-semibold">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 border rounded"
              placeholder="Enter new password"
            />
            <label htmlFor="confirm-password" className="block text-sm font-semibold">Confirm Password</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border rounded"
              placeholder="Re-enter new password"
            />
            {passwordMismatch && (
              <p className="text-red-600 text-sm font-semibold">⚠️ Passwords do not match.</p>
            )}
            <button
              type="submit"
              disabled={loading || newPassword.length < 6 || passwordMismatch || confirmPassword.length === 0}
              className="w-full p-3 rounded bg-blue-600 text-white font-bold disabled:opacity-50"
            >
              {loading ? 'Updating…' : passwordMismatch ? 'Passwords Do Not Match' : 'Update Password'}
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
