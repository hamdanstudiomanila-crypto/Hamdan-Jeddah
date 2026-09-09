import type { ChatTurn } from './ask-ai';

export function languageRequest(question: string): 'en' | 'tl' | 'ar' | undefined {
  if (/^(?:(?:please|reply|answer|respond|in)\s+)*(?:arabic|saudi arabic|hejazi|hijazi)(?:\s+please)?[.!?]*$/i.test(question.trim()) || /^(?:بالعربي(?:ة)?|عربي|العربية|باللهجة الحجازية|بالسعودي)(?: لو سمحت)?[.!؟]*$/.test(question.trim())) return 'ar';
  const match = question.trim().match(/^(?:(?:please|pls|paki)\s+)?(?:(?:answer|reply|respond|say (?:it|that)|translate(?: (?:it|that))?)\s+)?(?:in\s+)?(english|tagalog|filipino)(?:\s+(?:please|pls|po|naman|version|lang))*[.!?]*$/i);
  return match ? (match[1].toLowerCase() === 'english' ? 'en' : 'tl') : undefined;
}

export function resolveLanguageFollowUp(question: string, language: string, history: ChatTurn[]) {
  const requested = languageRequest(question);
  if (!requested) return { question, language: language === 'auto' && /[\u0600-\u06ff]/.test(question) ? 'ar' : language, history, missingTopic: false };
  for (let index = history.length - 1; index >= 0; index--) {
    const turn = history[index];
    if (turn.role === 'user' && !languageRequest(turn.content)) {
      return { question: turn.content.slice(0, 500), language: requested, history: history.slice(0, index), missingTopic: false };
    }
  }
  return { question, language: requested, history: [], missingTopic: true };
}
