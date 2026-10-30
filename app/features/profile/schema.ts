export const kinds = ['employment', 'freelance', 'project', 'skill', 'education', 'certification'] as const;
export type ClaimKind = typeof kinds[number];
export interface Source { fileName: string; fileHash: string; textHash: string; pages: { page: number; text: string }[] }
export interface Evidence { page: number; start: number; end: number; quote: string }
export interface Claim {
  id: string; kind: ClaimKind;
  values: { label: string; organization: string; start: string; end: string; proficiency: string; url: string };
  evidence: Evidence | null; correctionReason: string;
  basis: 'cv' | 'attestation' | null; confirmedAt: string | null;
}
export interface Preferences {
  titles: string[]; locations: string[]; timeZone: string; overlapZones: string[];
  hoursPerWeek: number | null; workingHours: string;
  salary: { min: number; max: number; currency: string; period: 'hour' | 'month' | 'year' } | null;
}
export interface ProfileRevision {
  schemaVersion: 1; id: string; ownerId: string; parentId: string | null; createdAt: string;
  source: Source; claims: Claim[]; preferences: Preferences;
}
export const emptyPreferences = (): Preferences => ({ titles: [], locations: [], timeZone: '', overlapZones: [], hoursPerWeek: null, workingHours: '', salary: null });
export const emptyValues = (): Claim['values'] => ({ label: '', organization: '', start: '', end: '', proficiency: '', url: '' });
function fail(): never { throw new Error('Invalid profile or unsupported evidence'); }
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 2000): v is string => typeof v === 'string' && v.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v);
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k)) && allowed.every(k => k in v);
export const validId = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9-]{1,100}$/.test(v);
const timestamp = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v));
export function validateSource(value: unknown): Source {
  if (!obj(value) || !keys(value, ['fileName', 'fileHash', 'textHash', 'pages']) || !str(value.fileName, 255) || !value.fileName || !/^[a-f0-9]{64}$/.test(String(value.fileHash)) || !/^[a-f0-9]{64}$/.test(String(value.textHash)) || !Array.isArray(value.pages) || !value.pages.length || value.pages.length > 50) fail();
  let total = 0;
  value.pages.forEach((p, i) => { if (!obj(p) || !keys(p, ['page', 'text']) || p.page !== i + 1 || !str(p.text, 100000)) fail(); total += p.text.length; });
  if (total > 300000 || !value.pages.some(p => p.text.trim())) fail();
  return value as unknown as Source;
}
export function validEvidence(e: Evidence | null, source: Source): boolean {
  if (!e || !obj(e) || !keys(e, ['page', 'start', 'end', 'quote']) || !Number.isInteger(e.page) || !Number.isInteger(e.start) || !Number.isInteger(e.end) || !str(e.quote, 20000) || !e.quote.trim()) return false;
  const page = source.pages.find(p => p.page === e.page);
  return !!page && e.start >= 0 && e.end > e.start && e.end <= page.text.length && page.text.slice(e.start, e.end) === e.quote;
}
function dateRange(value: string): [number, number] | null {
  if (!value) return null;
  if (!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(value)) return fail();
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2200 || (month !== undefined && (month < 1 || month > 12))) return fail();
  const days = new Date(Date.UTC(year, month || 12, 0)).getUTCDate();
  if (day !== undefined && (day < 1 || day > days)) return fail();
  return [Date.UTC(year, (month || 1) - 1, day || 1), Date.UTC(year, (month || 12) - 1, day || days)];
}
export function validateClaim(v: unknown, source: Source): Claim {
  if (!obj(v) || !keys(v, ['id', 'kind', 'values', 'evidence', 'correctionReason', 'basis', 'confirmedAt']) || !validId(v.id) || !kinds.includes(v.kind as ClaimKind) || !obj(v.values) || !keys(v.values, Object.keys(emptyValues())) || !Object.values(v.values).every(t => str(t)) || !(v.values.label as string).trim() || !str(v.correctionReason) || ![null, 'cv', 'attestation'].includes(v.basis as null) || (v.confirmedAt !== null && !timestamp(v.confirmedAt))) fail();
  const c = v as unknown as Claim;
  if (c.evidence !== null && !validEvidence(c.evidence, source)) fail();
  const start = dateRange(c.values.start); const end = c.values.end === 'present' ? null : dateRange(c.values.end);
  if (start && end && start[0] > end[1]) fail();
  if (c.values.url) { try { const u = new URL(c.values.url); if (u.protocol !== 'https:' || u.username || u.password) fail(); } catch { fail(); } }
  if ((c.confirmedAt === null) !== (c.basis === null)) fail();
  if (c.basis === 'cv' && (!validEvidence(c.evidence, source) || !Object.entries(c.values).every(([key, t]) => !t || c.evidence!.quote.includes(t) || (key === 'end' && t === 'present' && /\bpresent\b/i.test(c.evidence!.quote))))) fail();
  if (c.basis === 'attestation' && c.correctionReason.trim().length < 10) fail();
  return structuredClone(c);
}
export function editClaim(c: Claim, update: Partial<Pick<Claim, 'kind' | 'values' | 'evidence' | 'correctionReason'>>): Claim {
  return { ...c, ...update, basis: null, confirmedAt: null };
}
export function confirmClaim(c: Claim, source: Source, basis: 'cv' | 'attestation'): Claim {
  return validateClaim({ ...c, basis, confirmedAt: new Date().toISOString() }, source);
}
export function validatePreferences(v: unknown): Preferences {
  if (!obj(v) || !keys(v, Object.keys(emptyPreferences()))) fail();
  for (const field of ['titles', 'locations', 'overlapZones']) if (!Array.isArray(v[field]) || v[field].length > 30 || !v[field].every((s: unknown) => str(s, 200) && s.trim())) fail();
  if (!str(v.timeZone, 100) || !str(v.workingHours, 500) || (v.hoursPerWeek !== null && (typeof v.hoursPerWeek !== 'number' || !Number.isFinite(v.hoursPerWeek) || v.hoursPerWeek < 0 || v.hoursPerWeek > 168))) fail();
  for (const zone of [v.timeZone, ...(v.overlapZones as string[])].filter(Boolean)) { try { new Intl.DateTimeFormat('en', { timeZone: zone as string }); } catch { fail(); } }
  if (v.salary !== null) {
    const s = v.salary;
    if (!obj(s) || !keys(s, ['min', 'max', 'currency', 'period']) || typeof s.min !== 'number' || typeof s.max !== 'number' || !Number.isFinite(s.min) || !Number.isFinite(s.max) || s.min < 0 || s.max < s.min || s.max > 1e12 || typeof s.currency !== 'string' || !/^[A-Z]{3}$/.test(s.currency) || !['hour', 'month', 'year'].includes(s.period as string)) fail();
  }
  return structuredClone(v) as unknown as Preferences;
}
export function validateProfile(v: unknown): ProfileRevision {
  if (!obj(v) || !keys(v, ['schemaVersion', 'id', 'ownerId', 'parentId', 'createdAt', 'source', 'claims', 'preferences']) || v.schemaVersion !== 1 || !validId(v.id) || !validId(v.ownerId) || (v.parentId !== null && (!validId(v.parentId) || v.parentId === v.id)) || !timestamp(v.createdAt) || !Array.isArray(v.claims) || v.claims.length > 250) fail();
  const source = validateSource(v.source);
  const claims = v.claims.map(c => validateClaim(c, source));
  if (new Set(claims.map(c => c.id)).size !== claims.length) fail();
  return { ...v, source, claims, preferences: validatePreferences(v.preferences) } as ProfileRevision;
}
