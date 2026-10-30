import { expect, it } from 'vitest';
import { parseFeedback } from '../app/lib/validation';

const category = { score: 65, tips: [] };
const feedback = { overallScore: 65, ATS: category, toneAndStyle: category, content: category, structure: category, skills: category };
it('rejects non-string tip kinds rather than coercing an array into a valid enum', () => {
  const data = { ...feedback, ATS: { score: 65, tips: [{ type: ['good'], tip: 'Synthetic' }] } };
  expect(() => parseFeedback({ message: { content: JSON.stringify(data) } })).toThrow();
});
it.each([
  { message: { content: JSON.stringify(feedback), refusal: 'blocked' } },
  { message: { content: 'x'.repeat(200001) } },
  { message: { content: JSON.stringify({ ...feedback, overallScore: -1 }) } },
  { message: { content: JSON.stringify({ ...feedback, overallScore: '65' }) } },
  { message: { content: JSON.stringify({ ...feedback, content: { score: 50, tips: [{ type: 'good', tip: 'Synthetic' }] } }) } },
])('fails closed for controlled invalid provider response %#', response => expect(() => parseFeedback(response)).toThrow());
