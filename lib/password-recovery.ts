import type { SupabaseClient } from '@supabase/supabase-js';

type RecoveryAuth = Pick<SupabaseClient['auth'], 'exchangeCodeForSession' | 'setSession' | 'verifyOtp'>;

/** Consume an explicit recovery link; never accept an unrelated existing session. */
export async function initializeRecoverySession(auth: RecoveryAuth, url: URL) {
  const hash = new URLSearchParams(url.hash.slice(1));
  const value = (key: string) => url.searchParams.get(key) || hash.get(key);
  if (value('error') || value('error_code')) {
    throw new Error(value('error_description') || 'This reset link is invalid or has expired. Please request a new one.');
  }
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  let result;
  if (code) {
    result = await auth.exchangeCodeForSession(code);
  } else if (tokenHash && url.searchParams.get('type') === 'recovery') {
    result = await auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
  } else {
    const access_token = hash.get('access_token');
    const refresh_token = hash.get('refresh_token');
    if (!access_token || !refresh_token) {
      throw new Error('Missing reset token in URL. Please use the link from your email again, or request a new one.');
    }
    if (hash.get('type') !== 'recovery') throw new Error('This token is not for password recovery.');
    result = await auth.setSession({ access_token, refresh_token });
  }
  if (result.error) throw result.error;
  if (!result.data.session) throw new Error('Unable to initialize a recovery session. Please request a new link.');
}
