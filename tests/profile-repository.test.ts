import { expect, it, vi } from 'vitest';
import { createProfileRepository } from '../app/features/profile/repository';
import { makeSource } from '../app/features/profile/extract';
import { emptyPreferences, type ProfileRevision } from '../app/features/profile/schema';

async function setup() {
  const data = new Map<string, string>(); let active = true;
  const source = await makeSource('safe.pdf', new Uint8Array([1]), ['Skills\nReact']);
  const revision: ProfileRevision = { schemaVersion: 1, id: 'revision-1', ownerId: 'a', parentId: null, createdAt: '2026-10-27T10:00:00.000Z', source, claims: [], preferences: emptyPreferences() };
  const deps = { ownerId: 'a', assertSession: () => { if (!active) throw new Error('Session changed'); }, get: async (k: string) => data.get(k) ?? null, set: async (k: string, v: string): Promise<boolean | undefined> => { data.set(k, v); return true; }, list: async () => [...data].map(([key, value]) => ({ key, value })), lock: async <T,>(_: string, work: () => Promise<T>) => work() };
  return { data, revision, deps, switchAccount: () => { active = false; }, repo: createProfileRepository(deps) };
}
it('round-trips an immutable owned revision and reconciles an ambiguous successful write without rewriting', async () => {
  const s = await setup(); let writes = 0;
  s.deps.set = async (k, v) => { writes++; s.data.set(k, v); throw new Error('lost receipt'); };
  const repo = createProfileRepository(s.deps);
  await repo.save(s.revision); await repo.save(s.revision);
  expect(writes).toBe(1); expect((await repo.load()).latest?.id).toBe('revision-1');
});
it('refuses cross-owner records and keys instead of returning private data', async () => {
  const s = await setup();
  s.data.set('jp:v1:profile:a:revision-1', JSON.stringify({ ...s.revision, ownerId: 'b' }));
  await expect(s.repo.load()).rejects.toThrow();
  s.data.clear(); s.data.set('jp:v1:profile:b:revision-1', JSON.stringify(s.revision));
  await expect(s.repo.load()).rejects.toThrow();
});
it('rejects stale reads and stops a switched session before writing', async () => {
  const s = await setup();
  s.deps.list = async () => { s.switchAccount(); return []; };
  const set = vi.fn(s.deps.set); s.deps.set = set;
  const repo = createProfileRepository(s.deps);
  await expect(repo.load()).rejects.toThrow('Session');
  await expect(repo.save(s.revision)).rejects.toThrow('Session'); expect(set).not.toHaveBeenCalled();
});
it('refuses save if account changes after remote write and never presents success', async () => {
  const s = await setup(); s.deps.set = async (k, v) => { s.data.set(k, v); s.switchAccount(); return true; };
  await expect(createProfileRepository(s.deps).save(s.revision)).rejects.toThrow('Session');
});
it('does not overwrite an existing revision or save on top of a stale parent', async () => {
  const s = await setup(); await s.repo.save(s.revision);
  await expect(s.repo.save({ ...s.revision, preferences: { ...emptyPreferences(), titles: ['Changed'] } })).rejects.toThrow();
  await expect(s.repo.save({ ...s.revision, id: 'revision-2' })).rejects.toThrow();
  await s.repo.save({ ...s.revision, id: 'revision-2', parentId: 'revision-1' });
  expect((await s.repo.load()).latest?.id).toBe('revision-2');
});
it('detects concurrent branches and missing parents and blocks further edits', async () => {
  const s = await setup(); await s.repo.save(s.revision);
  for (const id of ['branch-1', 'branch-2']) s.data.set(`jp:v1:profile:a:${id}`, JSON.stringify({ ...s.revision, id, parentId: 'revision-1' }));
  expect((await s.repo.load()).conflict).toBe(true);
  await expect(s.repo.save({ ...s.revision, id: 'revision-3', parentId: 'branch-1' })).rejects.toThrow();
  s.data.delete('jp:v1:profile:a:revision-1'); await expect(s.repo.load()).rejects.toThrow();
});
it('rejects source-text corruption even when its claims look valid', async () => {
  const s = await setup(); s.revision.source.pages[0].text = 'Forged';
  await expect(s.repo.save(s.revision)).rejects.toThrow(); expect(s.data.size).toBe(0);
});
it('preserves an uncertain save for same-ID retry and never invents a successful receipt', async () => {
  const s = await setup(); s.deps.set = async () => undefined;
  await expect(createProfileRepository(s.deps).save(s.revision)).rejects.toThrow();
  expect((await s.repo.load()).latest).toBeNull();
});
it('requires locking support before any write', async () => {
  const s = await setup();
  await expect(createProfileRepository({ ...s.deps, lock: undefined }).save(s.revision)).rejects.toThrow();
  expect(s.data.size).toBe(0);
});
it('does not report a reconciled old revision as current after a concurrent branch appears', async () => {
  const s = await setup(); await s.repo.save(s.revision);
  for (const id of ['branch-1', 'branch-2']) s.data.set(`jp:v1:profile:a:${id}`, JSON.stringify({ ...s.revision, id, parentId: 'revision-1' }));
  await expect(s.repo.save(s.revision)).rejects.toThrow();
});
it('refuses an aggregate history overflow before writing so the existing profile stays readable', async () => {
  const s = await setup();
  const source = await makeSource('large-safe.pdf', new Uint8Array([1]), Array(3).fill('x'.repeat(83000)));
  for (let n = 0; n < 60; n++) {
    const id = `revision-${n}`;
    s.data.set(`jp:v1:profile:a:${id}`, JSON.stringify({ ...s.revision, id, parentId: n ? `revision-${n - 1}` : null, source }));
  }
  expect((await s.repo.load()).latest?.id).toBe('revision-59');
  await expect(s.repo.save({ ...s.revision, id: 'too-large', parentId: 'revision-59', source })).rejects.toThrow();
  expect(s.data.has('jp:v1:profile:a:too-large')).toBe(false);
  expect((await s.repo.load()).latest?.id).toBe('revision-59');
}, 15000);
