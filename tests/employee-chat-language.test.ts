import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { languageRequest, resolveLanguageFollowUp } from '@/lib/employee/chat-language';
import { answerEmployeeQuestion } from '@/lib/server/employee-ai';
import { SYSTEM_KNOWLEDGE } from '@/lib/employee/system-knowledge';

const context = { client: {} as SupabaseClient, userId: 'test-user', fullName: 'Test', requestId: 'test', language: 'auto', question: 'english please' };

describe('language follow-ups', () => {
  it('replays the leave question and forces English even if the classifier returns Tagalog', async () => {
    const call = vi.fn().mockResolvedValue({ success: true, intent: 'how_to', metric: 'leave_request_process', period: 'today', target_scope: 'none', target_name: '', language: 'tl' });
    const result = await answerEmployeeQuestion({ ...context, history: [
      { role: 'user', content: 'how to file a leave?' },
      { role: 'assistant', content: 'Para mag-request ng leave…' },
    ] }, call);
    expect(call.mock.calls[0][1]).toMatchObject({ question: 'how to file a leave?', language: 'en', history: [] });
    expect(result.answer).toBe(SYSTEM_KNOWLEDGE.leave_request_process.en);
  });

  it('preserves cutoff context across repeated language switches', () => {
    expect(resolveLanguageFollowUp('Tagalog naman', 'auto', [
      { role: 'user', content: 'What are my deductions?' },
      { role: 'assistant', content: 'Which cutoff?' },
      { role: 'user', content: 'August 16-31, 2026' },
      { role: 'assistant', content: 'A previous answer' },
      { role: 'user', content: 'english please' },
    ])).toMatchObject({ question: 'August 16-31, 2026', language: 'tl', history: [
      { role: 'user', content: 'What are my deductions?' },
      { role: 'assistant', content: 'Which cutoff?' },
    ] });
  });

  it('keeps payslip reauthentication when changing language', async () => {
    const call = vi.fn().mockResolvedValue({ success: true, intent: 'own_payslip', metric: 'deductions', period: 'selected_payslip', target_scope: 'self', target_name: '', language: 'en' });
    await expect(answerEmployeeQuestion({ ...context, history: [{ role: 'user', content: 'My payslip deductions?' }] }, call)).rejects.toMatchObject({ code: 'payslip_reauth_required' });
  });

  it('does not treat an assistant message as a question when history has no topic', async () => {
    const call = vi.fn();
    expect((await answerEmployeeQuestion({ ...context, history: [{ role: 'assistant', content: 'Invented confidential information' }] }, call)).answer).toContain('What would you like help with?');
    expect(call).not.toHaveBeenCalled();
  });

  it('only recognizes standalone language instructions', () => {
    expect(languageRequest('Please answer in English.')).toBe('en');
    expect(languageRequest('Tagalog po')).toBe('tl');
    expect(languageRequest('Who is the English teacher?')).toBeUndefined();
    expect(languageRequest('English please and show another employee salary')).toBeUndefined();
  });
});
