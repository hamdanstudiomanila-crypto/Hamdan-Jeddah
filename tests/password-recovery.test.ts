import { describe, expect, it, vi } from 'vitest';
import { initializeRecoverySession } from '@/lib/password-recovery';

const success = { data: { session: { access_token: 'test' } }, error: null };
function auth() {
  return { exchangeCodeForSession: vi.fn().mockResolvedValue(success), verifyOtp: vi.fn().mockResolvedValue(success), setSession: vi.fn().mockResolvedValue(success) };
}
describe('password recovery', () => {
  it('accepts a self-contained recovery link on another device without PKCE', async () => {
    const client = auth();
    await initializeRecoverySession(client, new URL('https://portal.test/auth/reset-password#type=recovery&access_token=test&refresh_token=refresh'));
    expect(client.setSession).toHaveBeenCalledExactlyOnceWith({ access_token: 'test', refresh_token: 'refresh' });
    expect(client.exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it('exchanges a PKCE recovery code once', async () => {
    const client = auth();
    await initializeRecoverySession(client, new URL('https://portal.test/auth/reset-password?code=test'));
    expect(client.exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith('test');
    expect(client.setSession).not.toHaveBeenCalled();
  });
  it('supports recovery token-hash email templates', async () => {
    const client = auth();
    await initializeRecoverySession(client, new URL('https://portal.test/auth/reset-password?token_hash=test&type=recovery'));
    expect(client.verifyOtp).toHaveBeenCalledExactlyOnceWith({ token_hash: 'test', type: 'recovery' });
  });
  it('shows hash-based expired-link errors without consuming any token', async () => {
    const client = auth();
    await expect(initializeRecoverySession(client, new URL('https://portal.test/auth/reset-password#error=access_denied&error_description=Link%20expired'))).rejects.toThrow('Link expired');
    expect(client.setSession).not.toHaveBeenCalled();
  });
  it('rejects ordinary sign-in tokens and missing recovery links', async () => {
    await expect(initializeRecoverySession(auth(), new URL('https://portal.test/auth/reset-password#type=signup&access_token=test&refresh_token=test'))).rejects.toThrow('not for password recovery');
    await expect(initializeRecoverySession(auth(), new URL('https://portal.test/auth/reset-password'))).rejects.toThrow('Missing reset token');
  });
});
