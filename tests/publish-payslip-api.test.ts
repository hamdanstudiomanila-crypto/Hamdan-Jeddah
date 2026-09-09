import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: { id: 'admin' } as { id: string } | null,
  role: 'admin',
  row: { id: 'slip', published: true } as { id: string; published: boolean } | null,
  error: null as { message: string } | null,
}));
const mocks = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), fetch: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({
  auth: { getUser: async () => ({ data: { user: state.user } }) }, from: mocks.from,
}) }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('N8N_PUBLISH_PAYSLIP_WEBHOOK_URL', 'https://workflow.example/webhook/publish-payslip-jeddah');
  vi.stubEnv('N8N_PUBLISH_WEBHOOK_SECRET', 'test-secret');
  vi.stubGlobal('fetch', mocks.fetch);
  state.user = { id: 'admin' }; state.role = 'admin';
  state.row = { id: 'slip', published: true }; state.error = null;
  mocks.update.mockImplementation(() => ({ eq: () => ({ select: () => ({
    maybeSingle: async () => ({ data: state.row, error: state.error }),
  }) }) }));
  mocks.from.mockImplementation((table: string) => table === 'profiles'
    ? { select: () => ({ eq: () => ({ single: async () => ({ data: { role: state.role } }) }) }) }
    : { update: mocks.update });
  mocks.fetch.mockResolvedValue(new Response('{}', { status: 200 }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

async function publish() {
  const { POST } = await import('@/app/api/publish-payslip/route');
  return POST(new Request('http://localhost/api/publish-payslip', {
    method: 'POST', body: JSON.stringify({ payslip_id: 'slip' }),
  }));
}

describe('payslip publication and email trigger', () => {
  it('does not claim publication or trigger email when RLS updates zero rows', async () => {
    state.row = null;
    const response = await publish();
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ published: false, emailTriggered: false });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('rejects an unconfirmed published value', async () => {
    state.row!.published = false;
    expect((await publish()).status).toBe(409);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('does not call the webhook after a database error', async () => {
    state.error = { message: 'permission denied' };
    expect((await publish()).status).toBe(500);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('triggers the configured webhook only after confirmed publication', async () => {
    expect(await (await publish()).json()).toEqual({ published: true, emailTriggered: true });
    expect(mocks.fetch).toHaveBeenCalledWith('https://workflow.example/webhook/publish-payslip-jeddah',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ payslip_id: 'slip' }),
        headers: expect.objectContaining({ 'x-publish-secret': 'test-secret' }), signal: expect.any(AbortSignal) }));
  });
  it('distinguishes missing configuration from publication failure', async () => {
    vi.stubEnv('N8N_PUBLISH_WEBHOOK_SECRET', '');
    expect(await (await publish()).json()).toMatchObject({ published: true, emailTriggered: false, emailTriggerError: 'not_configured' });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('reports rejected webhook status without claiming email delivery', async () => {
    mocks.fetch.mockResolvedValue(new Response('{}', { status: 404 }));
    expect(await (await publish()).json()).toMatchObject({ published: true, emailTriggered: false, emailTriggerError: 'webhook_rejected', webhookStatus: 404 });
  });
  it('reports a network failure while preserving confirmed publication', async () => {
    mocks.fetch.mockRejectedValue(new TypeError('fetch failed'));
    expect(await (await publish()).json()).toMatchObject({ published: true, emailTriggered: false, emailTriggerError: 'webhook_unreachable' });
  });
  it.each(['employee', 'unknown'])('does not publish for role %s', async role => {
    state.role = role;
    expect((await publish()).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('does not publish without a session', async () => {
    state.user = null;
    expect((await publish()).status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
