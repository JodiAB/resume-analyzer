import type { Board } from './boards';
import { isObject, text, id, timestamp, validateJob, mentionedSkills, safeJobUrl, type Job, type Salary } from './model';
const object = (v: unknown): Record<string, unknown> => { if (!isObject(v)) throw new Error('Malformed source record'); return v; };
const optional = (v: unknown, max = 500): string | null => text(v, max) && v.trim() ? v : null;
const required = (v: unknown, max = 500): string => { const t = optional(v, max); if (!t) throw new Error('Missing source field'); return t; };
const date = (v: unknown) => timestamp(v) ? new Date(v).toISOString() : null;
function plain(v: unknown): string {
  let s = typeof v === 'string' ? v : '';
  if (s.length > 200000) throw new Error('Description size limit');
  for (let i = 0; i < 3; i++) s = s.replace(/&(?:lt|gt|amp|quot|apos|nbsp|#\d+|#x[a-f0-9]+);/gi, entity => {
    const named: Record<string,string> = { '&lt;':'<','&gt;':'>','&amp;':'&','&quot;':'"','&apos;':"'",'&nbsp;':' ' };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const code = entity.toLowerCase().startsWith('&#x') ? parseInt(entity.slice(3, -1), 16) : parseInt(entity.slice(2, -1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ' ';
  });
  s = s.replace(/<(script|style|iframe)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<\/?(?:p|li|div|br|h[1-6])\b[^>]*>/gi, '\n').replace(/<[^>]*>/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (s.length > 60000) throw new Error('Description size limit'); return s;
}
function salary(v: unknown): Salary[] {
  if (!isObject(v)) return [];
  const min = v.min ?? v.minValue; const max = v.max ?? v.maxValue; const currency = v.currency ?? v.currencyCode;
  const interval = typeof v.interval === 'string' ? v.interval.toLowerCase() : '';
  const period = /^(?:year|yearly|annual|1 year)$/.test(interval) ? 'year' : /^(?:month|monthly|1 month)$/.test(interval) ? 'month' : /^(?:hour|hourly|1 hour)$/.test(interval) ? 'hour' : 'unknown';
  return typeof min === 'number' && typeof max === 'number' && Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max >= min && max <= 1e12 && typeof currency === 'string' && /^[A-Z]{3}$/.test(currency) ? [{ min, max, currency, period }] : [];
}
export function normalizePosting(board: Board, raw: unknown, checkedAt: string): Job | null {
  const r = object(raw);
  if (board.source === 'ashby') { if (r.isListed === false) return null; if (r.isListed !== true) throw new Error('Unverified listing visibility'); }
  if (board.source === 'greenhouse' && r.internal_job_id === null) return null;
  let sourceId = String(r.id ?? '');
  // Ashby's documented job URL is also a stable identity if the optional id is absent.
  if (!sourceId && board.source === 'ashby') sourceId = new URL(required(r.jobUrl, 2000)).pathname.split('/').filter(Boolean).at(-1) || '';
  if (!id(sourceId)) throw new Error('Invalid source identifier');
  const title = required(board.source === 'lever' ? r.text : r.title);
  const url = required(board.source === 'greenhouse' ? r.absolute_url : r.applyUrl || (board.source === 'lever' ? r.hostedUrl : r.jobUrl), 2000); safeJobUrl(url);
  const categories = isObject(r.categories) ? r.categories : {};
  const description = board.source === 'greenhouse' ? plain(r.content) : board.source === 'ashby' ? plain(r.descriptionPlain || r.descriptionHtml) : [plain(r.descriptionPlain || r.description), ...(Array.isArray(r.lists) ? r.lists.slice(0, 50).map(l => { const list = object(l); return `${plain(list.text)}\n${plain(list.content)}`; }) : []), plain(r.additionalPlain || r.additional)].filter(Boolean).join('\n');
  const location = board.source === 'greenhouse' ? (isObject(r.location) ? r.location.name : null) : board.source === 'lever' ? categories.location : r.location;
  const locations = [optional(location, 300), ...(board.source === 'ashby' && Array.isArray(r.secondaryLocations) ? r.secondaryLocations.map(l => isObject(l) ? optional(l.location, 300) : null) : board.source === 'lever' && Array.isArray(categories.allLocations) ? categories.allLocations.map(l => optional(l, 300)) : [])].filter((s): s is string => !!s);
  const workplace = optional(r.workplaceType) || (locations.some(l=>/\bhybrid\b/i.test(l))?'Hybrid':locations.some(l => /\bremote\b/i.test(l)&&!/\b(?:no|not|unavailable)\b/i.test(l)) ? 'Remote' : '');
  const remote: Job['remote'] = /^remote$/i.test(workplace) ? 'REMOTE' : /^hybrid$/i.test(workplace) ? 'HYBRID' : /^(?:onsite|on-site)$/i.test(workplace) ? 'ONSITE' : 'UNKNOWN';
  const publishedAt = board.source === 'greenhouse' ? date(r.first_published) : board.source === 'ashby' ? date(r.publishedAt) : null;
  const compensation = isObject(r.compensation) ? r.compensation : {};
  const payRanges=Array.isArray(r.pay_input_ranges)?r.pay_input_ranges.filter(isObject):[];
  const bands = board.source === 'lever' ? salary(r.salaryRange) : board.source === 'ashby' && Array.isArray(compensation.summaryComponents) ? compensation.summaryComponents.filter(c => isObject(c) && c.compensationType === 'Salary').flatMap(salary) : board.source==='greenhouse'?payRanges.flatMap(s=>salary({min:typeof s.min_cents==='number'?s.min_cents/100:null,max:typeof s.max_cents==='number'?s.max_cents/100:null,currency:s.currency_type})):[];
  return validateJob({ key: `${board.source}:${board.board}:${sourceId}`, source: board.source, board: board.board, sourceId, employer: optional(r.company_name, 200) || board.employer, employerCountry: board.employerCountry, title, url, description, locations: [...new Set(locations)], remote, employmentType: optional(board.source === 'lever' ? categories.commitment : r.employmentType), seniority: optional(categories.level), skills: mentionedSkills(description), salary: bands, salaryNotes: plain(board.source === 'lever' ? r.salaryDescriptionPlain : board.source==='greenhouse'?payRanges.map(p=>`${p.title||''}: ${p.blurb||''}`).join('\n'):compensation.compensationTierSummary).slice(0, 2000), publishedAt, publicationKind: !publishedAt ? 'UNKNOWN' : board.source === 'greenhouse' ? 'FIRST_PUBLISHED' : 'LAST_PUBLISHED', updatedAt: board.source === 'greenhouse' ? date(r.updated_at) : null, deadline: board.source === 'greenhouse' ? date(r.application_deadline) : null, checkedAt, availability: 'OPEN', checkError: null });
}
