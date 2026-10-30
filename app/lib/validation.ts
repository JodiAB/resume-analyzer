type ObjectValue = Record<string, unknown>;
const object = (v: unknown): v is ObjectValue => typeof v === 'object' && v !== null && !Array.isArray(v);
const score = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= 20000;

export function validateFeedback(value: unknown): Feedback {
  if (!object(value) || !score(value.overallScore)) throw new Error('Invalid feedback score');
  for (const name of ['ATS', 'toneAndStyle', 'content', 'structure', 'skills']) {
    const category = value[name];
    if (!object(category) || !score(category.score) || !Array.isArray(category.tips) || category.tips.length > 100) throw new Error('Invalid feedback category');
    for (const tip of category.tips) {
      if (!object(tip) || typeof tip.type !== 'string' || !['good', 'improve'].includes(tip.type) || !text(tip.tip) || (name !== 'ATS' && !text(tip.explanation))) throw new Error('Invalid feedback tip');
    }
  }
  return value as unknown as Feedback;
}

export function parseFeedback(response: unknown): Feedback {
  if (!object(response) || !object(response.message) || response.message.refusal) throw new Error('AI feedback unavailable or refused');
  const content = response.message.content;
  const raw = typeof content === 'string' ? content : Array.isArray(content) ? content.map(v => object(v) && typeof v.text === 'string' ? v.text : '').join('') : '';
  if (!raw || raw.length > 200000) throw new Error('Invalid AI response');
  try {
    return validateFeedback(JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')));
  } catch { throw new Error('AI returned invalid feedback. Please retry.'); }
}

export function validFilePath(value: unknown): value is string {
  return text(value) && !/[\\:%?#\x00-\x1f]/.test(value) && !value.startsWith('//') && !value.split('/').some(p => p === '..' || p === '.');
}

export function parseResume(raw: string): Resume {
  const value: unknown = JSON.parse(raw);
  if (!object(value) || typeof value.id !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(value.id) || !validFilePath(value.resumePath) || !validFilePath(value.imagePath) || (value.companyName !== undefined && typeof value.companyName !== 'string') || (value.jobTitle !== undefined && typeof value.jobTitle !== 'string')) throw new Error('Invalid resume record');
  validateFeedback(value.feedback);
  return value as unknown as Resume;
}

export function safeNext(search: string): string {
  const next = new URLSearchParams(search).get('next') || '/';
  return /^(?:\/|\/upload|\/profile|\/prepare|\/applications|\/jobs|\/match\/(?:greenhouse|lever|ashby|manual)\/[a-zA-Z0-9_-]{1,100}\/[a-zA-Z0-9_-]{1,100}|\/wipe|\/resume\/[a-zA-Z0-9-]{1,100})$/.test(next) ? next : '/';
}
