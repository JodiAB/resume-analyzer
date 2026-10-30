import { captureSession, usePuterStore } from '../../lib/puter';
import { validateProfile, validId, type ProfileRevision } from './schema';
import { verifySource } from './extract';

interface Dependencies {
  ownerId: string; assertSession: () => void;
  get: (key: string) => Promise<string | null | undefined>;
  set: (key: string, value: string) => Promise<boolean | undefined>;
  list: (pattern: string, values: boolean) => Promise<unknown>;
  lock?: <T>(name: string, work: () => Promise<T>) => Promise<T>;
}
export function createProfileRepository(d: Dependencies) {
  if (!validId(d.ownerId)) throw new Error('Verified owner required');
  const prefix = `jp:v1:profile:${d.ownerId}:`;
  const parse = async (raw: string, key: string) => {
    if (raw.length > 1500000) throw new Error('Profile size limit exceeded');
    const record = validateProfile(JSON.parse(raw));
    if (record.ownerId !== d.ownerId || key !== prefix + record.id) throw new Error('Profile ownership mismatch');
    await verifySource(record.source); d.assertSession();
    return record;
  };
  const load = async () => {
    d.assertSession();
    const items = await d.list(prefix + '*', true); d.assertSession();
    if (!Array.isArray(items) || items.length > 100) throw new Error('Unable to enumerate profile revisions safely');
    const revisions: ProfileRevision[] = []; let size = 0;
    for (const item of items) {
      if (!item || typeof item !== 'object' || typeof item.key !== 'string' || typeof item.value !== 'string' || !item.key.startsWith(prefix)) throw new Error('Invalid profile listing');
      size += item.value.length; if (size > 15000000) throw new Error('Profile history size limit exceeded');
      revisions.push(await parse(item.value, item.key)); d.assertSession();
    }
    const byId = new Map(revisions.map(r => [r.id, r]));
    if (byId.size !== revisions.length) throw new Error('Duplicate profile revisions');
    for (const r of revisions) {
      const seen = new Set<string>(); let node: ProfileRevision | undefined = r;
      while (node) {
        if (seen.has(node.id)) throw new Error('Cyclic profile history'); seen.add(node.id);
        if (node.parentId !== null && !byId.has(node.parentId)) throw new Error('Incomplete profile history');
        node = node.parentId ? byId.get(node.parentId) : undefined;
      }
    }
    const parents = new Set(revisions.map(r => r.parentId));
    const leaves = revisions.filter(r => !parents.has(r.id));
    const conflict = leaves.length > 1;
    return { latest: conflict ? null : leaves[0] || null, conflict, revisions: revisions.length, size };
  };
  const save = async (input: ProfileRevision): Promise<ProfileRevision> => {
    d.assertSession();
    const revision = validateProfile(input);
    if (revision.ownerId !== d.ownerId) throw new Error('Profile ownership mismatch');
    await verifySource(revision.source); d.assertSession();
    if (!d.lock) throw new Error('This browser requires Web Locks support for safe profile editing');
    return d.lock(`jobpilot:${d.ownerId}:profile`, async () => {
      d.assertSession(); const key = prefix + revision.id; const raw = JSON.stringify(revision);
      if (raw.length > 1500000) throw new Error('Profile size limit exceeded');
      const existing = await d.get(key); d.assertSession();
      if (existing !== null && existing !== undefined) {
        const old = await parse(existing, key);
        if (JSON.stringify(old) !== raw) throw new Error('An immutable revision cannot be overwritten');
        const history = await load(); d.assertSession();
        if (history.conflict || history.latest?.id !== old.id) throw new Error('Profile changed elsewhere. Reload before continuing');
        return old;
      }
      if (existing === undefined) throw new Error('Unable to establish revision absence');
      const history = await load(); d.assertSession();
      if (history.conflict || (history.latest?.id || null) !== revision.parentId) throw new Error('Profile changed elsewhere. Reload and review before saving');
      if (history.revisions >= 100) throw new Error('Profile history limit reached; no revision was removed');
      if (history.size + raw.length > 15000000) throw new Error('Profile history size limit reached; existing revisions were retained');
      // A failed receipt can still mean a remote commit. Reconcile this exact ID,
      // never retry the write blindly and never delete another session's data.
      try { await d.set(key, raw); } catch { /* Read back below. */ }
      d.assertSession();
      const readback = await d.get(key); d.assertSession();
      if (readback !== raw) throw new Error('Save outcome could not be confirmed. Retry this unchanged draft or reload');
      const saved = await parse(readback, key); d.assertSession();
      const after = await load(); d.assertSession();
      if (after.conflict || after.latest?.id !== saved.id) throw new Error('Concurrent profile edits detected. Reload before continuing');
      return saved;
    });
  };
  return { load, save };
}
export function currentProfileRepository() {
  const assertSession = captureSession();
  const state = usePuterStore.getState();
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return createProfileRepository({
    ownerId: state.auth.user!.uuid, assertSession,
    get: state.kv.get, set: state.kv.set, list: state.kv.list,
    lock: locks ? (name, work) => locks.request(name, work) : undefined,
  });
}
