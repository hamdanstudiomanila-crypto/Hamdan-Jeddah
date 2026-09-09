import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { languageRequest, resolveLanguageFollowUp } from '@/lib/employee/chat-language';
import { answerEmployeeQuestion } from '@/lib/server/employee-ai';
import { workDate } from '@/lib/work-schedule';
import workflow from '@/docs/automations/employee-ask-ai-classifier.json';

const ctx = { client: {} as SupabaseClient, userId: 'self', fullName: 'Test', requestId: 'test-ar', question: 'كيف أقدم إجازة مرضية؟', language: 'auto' };
const classification = { success: true, intent: 'how_to', metric: 'leave_request_process', period: 'today', target_scope: 'none', target_name: '', language: 'ar' };
function runNode(name: string, input: unknown, base?: unknown) {
  const code = workflow.nodes.find(node => node.name === name)?.parameters.jsCode;
  if (!code) throw new Error(`Missing node ${name}`);
  return new Function('$input', '$', code)({ first: () => ({ json: input }) }, () => ({ item: { json: base } }))[0].json;
}

describe('Jeddah request flows', () => {
  it('uses the Jeddah date before and after office midnight regardless of host timezone', () => {
    expect(workDate(new Date('2026-09-09T20:59:59Z'))).toBe('2026-09-09');
    expect(workDate(new Date('2026-09-09T21:00:00Z'))).toBe('2026-09-10');
  });
  it('recognizes Arabic and Hijazi language switches and preserves the topic', () => {
    expect(languageRequest('بالعربي لو سمحت')).toBe('ar');
    expect(languageRequest('in Hijazi please')).toBe('ar');
    expect(resolveLanguageFollowUp('بالعربي', 'auto', [{ role: 'user', content: 'How do I file leave?' }])).toMatchObject({ question: 'How do I file leave?', language: 'ar' });
  });
  it('translates a verified system guide including the sick leave attachment requirement', async () => {
    const call = vi.fn().mockResolvedValueOnce(classification).mockResolvedValueOnce({ success: true, request_id: ctx.requestId, answer: 'الإجازة المرضية تتطلب مستنداً داعماً.' });
    expect((await answerEmployeeQuestion(ctx, call)).answer).toContain('مستنداً');
    expect(call.mock.calls[0][1]).toMatchObject({ language: 'ar' });
    expect(call.mock.calls[1][1]).toMatchObject({ operation: 'translate_answer', answer: expect.stringContaining('Sick leave requires') });
  });
  it('does not access private data when an Arabic question asks about another employee', async () => {
    const call = vi.fn().mockResolvedValueOnce({ ...classification, intent: 'restricted_other_employee', metric: 'none', target_scope: 'other', target_name: 'Someone' }).mockResolvedValueOnce({ success: true, request_id: ctx.requestId, answer: 'لا يمكن مشاركة بيانات موظف آخر.' });
    const result = await answerEmployeeQuestion(ctx, call);
    expect(result.answer).toContain('لا يمكن');
    expect(call.mock.calls[1][1]).toMatchObject({ answer: expect.stringContaining('cannot share') });
  });
  it('rejects translation replies belonging to another request', async () => {
    const call = vi.fn().mockResolvedValueOnce(classification).mockResolvedValueOnce({ success: true, request_id: 'wrong', answer: 'نعم' });
    await expect(answerEmployeeQuestion(ctx, call)).rejects.toThrow();
  });
  it('runs the workflow translation branch with bounded input and strict output', () => {
    const validated = runNode('Validate Request', { body: { operation: 'translate_answer', answer: 'Request approved.', language: 'ar', request_id: 'test' } });
    expect(validated.valid).toBe(true);
    const prompt = runNode('Build Classifier Prompt', validated);
    expect(prompt.classifier_request.system_prompt).toContain('Translate faithfully');
    const reply = runNode('Validate Classifier Output', { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ answer: 'تمت الموافقة على الطلب.' }) }] } }] }, prompt);
    expect(reply).toMatchObject({ success: true, request_id: 'test', answer: 'تمت الموافقة على الطلب.' });
    expect(runNode('Validate Request', { body: { operation: 'translate_answer', answer: 'x'.repeat(16001), language: 'ar', request_id: 'test' } }).valid).toBe(false);
  });
});
