import { captureSession, usePuterStore } from '../../lib/puter';
import { mergeJobs } from './dedup';
import { defaultSearchPreferences, validateSearchPreferences, type SearchPreferences } from './preferences';
import { id, isObject, timestamp, validateJob, text, type Job, type Review, type TrackedJob } from './model';
export interface JobCommand { id: string; createdAt: string; jobs: Job[]; review: { key: string; state: Review } | null; preferences: SearchPreferences | null }
interface Event extends JobCommand { schemaVersion: 1; ownerId: string; parentId: string | null }
interface Dependencies {
  ownerId: string; assertSession: () => void; get: (key: string) => Promise<string | null | undefined>;
  set: (key: string, value: string) => Promise<boolean | undefined>; list: (pattern: string, values: boolean) => Promise<unknown>;
  lock?: <T>(name: string, work: () => Promise<T>) => Promise<T>;
}
export const jobCommand = (value: Partial<Pick<JobCommand,'jobs'|'review'|'preferences'>>): JobCommand => ({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), jobs: [], review: null, preferences: null, ...value });
function validateCommand(value: unknown): JobCommand {
  if (!isObject(value) || Object.keys(value).length !== 5 || !id(value.id) || !timestamp(value.createdAt) || !Array.isArray(value.jobs) || value.jobs.length > 200) throw new Error('Invalid discovery command');
  const jobs = value.jobs.map(validateJob);
  const r = value.review;
  if (r !== null && (!isObject(r) || Object.keys(r).length !== 2 || !text(r.key, 400) || !['NEW','SAVED','SHORTLISTED','DISMISSED'].includes(r.state as string))) throw new Error('Invalid review action');
  const preferences = value.preferences === null ? null : validateSearchPreferences(value.preferences);
  if (Number(jobs.length > 0) + Number(r !== null) + Number(preferences !== null) !== 1) throw new Error('One operation per discovery event is required');
  return { id: value.id, createdAt: value.createdAt, jobs, review: structuredClone(r) as JobCommand['review'], preferences };
}
export function createJobsRepository(d: Dependencies) {
  if (!id(d.ownerId)) throw new Error('Verified owner required');
  const prefix = `jp:v1:jobs:${d.ownerId}:`;
  const parse = (raw: string, key: string): Event => {
    if (raw.length > 1500000) throw new Error('Discovery event too large');
    const v: unknown = JSON.parse(raw);
    if (!isObject(v) || Object.keys(v).length !== 8 || v.schemaVersion !== 1 || v.ownerId !== d.ownerId || !id(v.id) || key !== prefix + v.id || (v.parentId !== null && (!id(v.parentId) || v.parentId === v.id))) throw new Error('Invalid discovery ownership or history');
    const command = validateCommand({ id: v.id, createdAt: v.createdAt, jobs: v.jobs, review: v.review, preferences: v.preferences });
    return { ...command, schemaVersion: 1, ownerId: d.ownerId, parentId: v.parentId as string | null };
  };
  const fold = (events: Event[]) => {
    let jobs: TrackedJob[] = []; let preferences = defaultSearchPreferences(); let hasPreferences = false;
    for (const e of events) {
      if (e.jobs.length) jobs = mergeJobs(jobs, e.jobs, e.createdAt);
      if (jobs.length > 200) throw new Error('Discovery record capacity reached; existing history retained');
      if (e.preferences) { preferences = e.preferences; hasPreferences = true; }
      if (e.review) {
        const t = jobs.find(j => j.aliases.includes(e.review!.key));
        if (!t) throw new Error('Review refers to an unknown job'); t.review = e.review.state;
      }
    }
    return { jobs, preferences, hasPreferences };
  };
  const history = async () => {
    d.assertSession(); const items = await d.list(prefix + '*', true); d.assertSession();
    if (!Array.isArray(items) || items.length > 500) throw new Error('Unable to verify discovery history');
    let size = 0; const events: Event[] = [];
    for (const item of items) {
      if (!isObject(item) || typeof item.key !== 'string' || typeof item.value !== 'string') throw new Error('Invalid discovery list');
      size += item.value.length; if (size > 15000000) throw new Error('Discovery history size limit');
      events.push(parse(item.value, item.key));
    }
    const byId = new Map(events.map(e => [e.id, e]));
    const parents = new Set(events.map(e => e.parentId)); const leaves = events.filter(e => !parents.has(e.id));
    if (byId.size !== events.length || (events.length && leaves.length !== 1)) throw new Error('Concurrent discovery history conflict; reload and review');
    const ordered: Event[] = []; let current: Event | undefined = leaves[0]; const visited = new Set<string>();
    while (current) {
      if (visited.has(current.id)) throw new Error('Cyclic discovery history'); visited.add(current.id); ordered.unshift(current);
      if (current.parentId !== null && !byId.has(current.parentId)) throw new Error('Incomplete discovery history');
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    if (ordered.length !== events.length) throw new Error('Disconnected discovery history');
    d.assertSession(); return { ...fold(ordered), events: ordered, latestId: leaves[0]?.id || null, size };
  };
  const load = async () => { const state = await history(); return { jobs: state.jobs, preferences: state.preferences, hasPreferences: state.hasPreferences }; };
  const append = async (input: JobCommand) => {
    d.assertSession(); const command = validateCommand(input);
    if (!d.lock) throw new Error('Web Locks support is required for private discovery saves');
    return d.lock(`jobpilot:${d.ownerId}:jobs`, async () => {
      d.assertSession(); const key = prefix + command.id;
      const previous = await d.get(key); d.assertSession();
      if (previous === undefined) throw new Error('Unable to verify command absence');
      const state = await history(); d.assertSession();
      if (previous !== null) {
        const old = parse(previous, key);
        if (JSON.stringify({ id: old.id, createdAt: old.createdAt, jobs: old.jobs, review: old.review, preferences: old.preferences }) !== JSON.stringify(command) || !state.events.some(e => e.id === old.id)) throw new Error('Immutable event mismatch');
        return { jobs: state.jobs, preferences: state.preferences, hasPreferences: state.hasPreferences };
      }
      const event: Event = { ...command, schemaVersion: 1, ownerId: d.ownerId, parentId: state.latestId };
      fold([...state.events, event]);
      const raw = JSON.stringify(event);
      if (raw.length > 1500000 || state.events.length >= 500 || state.size + raw.length > 15000000) throw new Error('Discovery capacity reached before write; existing data retained');
      try { await d.set(key, raw); } catch { /* Reconcile this exact event, never blindly replay a mutation. */ }
      d.assertSession(); const readback = await d.get(key); d.assertSession();
      if (readback !== raw) throw new Error('Save outcome unknown. Keep this command for an unchanged retry');
      return load();
    });
  };
  return { load, append };
}
export function currentJobsRepository() {
  const assertSession = captureSession(); const state = usePuterStore.getState();
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return createJobsRepository({ ownerId: state.auth.user!.uuid, assertSession, get: state.kv.get, set: state.kv.set, list: state.kv.list, lock: locks ? (name, work) => locks.request(name, work) : undefined });
}
