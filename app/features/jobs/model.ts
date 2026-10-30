export const sources = ['greenhouse', 'lever', 'ashby', 'manual'] as const;
export type SourceName = typeof sources[number];
export type JobStatus = 'VERIFIED' | 'UNVERIFIED' | 'INELIGIBLE' | 'EXPIRED' | 'SOURCE_ERROR';
export interface Salary { min: number; max: number; currency: string; period: 'hour' | 'month' | 'year' | 'unknown' }
export interface Job {
  key: string; source: SourceName; board: string; sourceId: string; employer: string; employerCountry: string | null;
  title: string; url: string | null; description: string; locations: string[];
  remote: 'REMOTE' | 'HYBRID' | 'ONSITE' | 'UNKNOWN'; employmentType: string | null; seniority: string | null;
  skills: string[]; salary: Salary[]; salaryNotes: string;
  publishedAt: string | null; publicationKind: 'FIRST_PUBLISHED' | 'LAST_PUBLISHED' | 'UNKNOWN'; updatedAt: string | null; deadline: string | null;
  checkedAt: string; availability: 'OPEN' | 'CLOSED' | 'UNKNOWN'; checkError: string | null;
}
export type Review = 'NEW' | 'SAVED' | 'SHORTLISTED' | 'DISMISSED';
export interface TrackedJob { job: Job; aliases: string[]; review: Review; firstSeenAt: string; lastSeenAt: string }
export const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const text = (v: unknown, max = 1000): v is string => typeof v === 'string' && v.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v);
export const id = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(v);
export function timestamp(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(v) || !Number.isFinite(Date.parse(v))) return false;
  const year=Number(v.slice(0,4)), month=Number(v.slice(5,7)), day=Number(v.slice(8,10));
  return month>=1&&month<=12&&day>=1&&day<=new Date(Date.UTC(year,month,0)).getUTCDate()&&Number(v.slice(11,13))<24&&Number(v.slice(14,16))<60&&Number(v.slice(17,19))<60;
}
export function safeJobUrl(raw: string): URL {
  if (!text(raw, 2000) || /[\s\\]/.test(raw)) throw new Error('Unsafe job URL');
  const u = new URL(raw); const host = u.hostname.toLowerCase();
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443') || !host.includes('.') || /^[\d.]+$/.test(host) || /[:\[\]]/.test(host) || /(?:^|\.)(localhost|local|internal|lan|invalid)$/.test(host) || host.endsWith('.')) throw new Error('Unsafe job URL');
  return u;
}
export function canonicalUrl(raw: string): string {
  const u = safeJobUrl(raw); u.hash = '';
  for (const k of [...u.searchParams.keys()]) if (/^utm_/i.test(k) || ['gh_src', 'lever-source'].includes(k)) u.searchParams.delete(k);
  if (['boards.greenhouse.io', 'job-boards.greenhouse.io'].includes(u.hostname)) u.hostname = 'job-boards.greenhouse.io';
  if (['jobs.lever.co', 'jobs.eu.lever.co', 'jobs.ashbyhq.com'].includes(u.hostname)) u.pathname = u.pathname.replace(/\/(?:apply|application)\/?$/, '');
  u.pathname = u.pathname.replace(/\/$/, '') || '/'; u.searchParams.sort(); return u.href;
}
export function validateJob(v: unknown): Job {
  if (!isObject(v)) throw new Error('Invalid job');
  const fields = ['key','source','board','sourceId','employer','employerCountry','title','url','description','locations','remote','employmentType','seniority','skills','salary','salaryNotes','publishedAt','publicationKind','updatedAt','deadline','checkedAt','availability','checkError'];
  if (Object.keys(v).length !== fields.length || fields.some(k => !(k in v)) || !sources.includes(v.source as SourceName) || !id(v.board) || !id(v.sourceId) || v.key !== `${v.source}:${v.board}:${v.sourceId}` || !text(v.employer, 200) || !v.employer.trim() || !text(v.title, 500) || !v.title.trim() || !text(v.description, 60000) || !text(v.salaryNotes, 2000)) throw new Error('Invalid job fields');
  for (const k of ['employerCountry', 'employmentType', 'seniority', 'checkError']) if (v[k] !== null && !text(v[k], 500)) throw new Error('Invalid optional job field');
  if (v.url !== null) { if (typeof v.url !== 'string') throw new Error('Invalid job link'); safeJobUrl(v.url); }
  if (!['REMOTE','HYBRID','ONSITE','UNKNOWN'].includes(v.remote as string) || !['OPEN','CLOSED','UNKNOWN'].includes(v.availability as string) || !['FIRST_PUBLISHED','LAST_PUBLISHED','UNKNOWN'].includes(v.publicationKind as string)) throw new Error('Invalid job status');
  for (const k of ['publishedAt', 'updatedAt', 'deadline']) if (v[k] !== null && !timestamp(v[k])) throw new Error('Invalid job date');
  if (!timestamp(v.checkedAt) || (v.publishedAt === null) !== (v.publicationKind === 'UNKNOWN')) throw new Error('Invalid publication evidence');
  for (const k of ['locations','skills']) if (!Array.isArray(v[k]) || v[k].length > 50 || !v[k].every(s => text(s, 300))) throw new Error('Invalid job list');
  if (!Array.isArray(v.salary) || v.salary.length > 20 || !v.salary.every(s => isObject(s) && Object.keys(s).length === 4 && typeof s.min === 'number' && typeof s.max === 'number' && Number.isFinite(s.min) && Number.isFinite(s.max) && s.min >= 0 && s.max >= s.min && s.max <= 1e12 && typeof s.currency === 'string' && /^[A-Z]{3}$/.test(s.currency) && ['hour','month','year','unknown'].includes(s.period as string))) throw new Error('Invalid salary');
  return structuredClone(v) as unknown as Job;
}
export const mentionedSkills = (description: string) => ['React','Next.js','TypeScript','Node.js','JavaScript','Python','SQL','GraphQL','AWS','Docker'].filter(s => new RegExp(`(?:^|[^a-z0-9])${s.replace(/\./g, '\\.')}(?:$|[^a-z0-9])`, 'i').test(description));
