import { expect, it, vi } from 'vitest';
import { createJobsRepository, jobCommand } from '../app/features/jobs/repository';
import { normalizePosting } from '../app/features/jobs/adapters.server';
import { getBoard } from '../app/features/jobs/boards';
import { gh, checked } from './fixtures/jobs';
const job = () => normalizePosting(getBoard('greenhouse', 'greenhouse'), gh, checked)!;
function setup() {
  const data = new Map<string,string>(); let active = true;
  const deps = { ownerId: 'a', assertSession: () => { if (!active) throw new Error('Session changed'); }, get: async (key: string) => data.get(key) ?? null, set: async (key: string, value: string): Promise<boolean | undefined> => { data.set(key, value); return true; }, list: async () => [...data].map(([key,value]) => ({key,value})), lock: async <T,>(_: string, work: () => Promise<T>) => work() };
  return { data, deps, repo: createJobsRepository(deps), switchAccount: () => { active = false; } };
}
it('persists discoveries and review actions without repeating full snapshots or resetting dismissed jobs', async () => {
  const s = setup(); await s.repo.append(jobCommand({ jobs: [job()] }));
  await s.repo.append(jobCommand({ review: { key: job().key, state: 'DISMISSED' } }));
  await s.repo.append(jobCommand({ jobs: [{ ...job(), title: 'Updated Frontend Developer' }] }));
  const loaded = await s.repo.load();
  expect(loaded.jobs).toHaveLength(1); expect(loaded.jobs[0].review).toBe('DISMISSED');
  const reviewEvent = JSON.parse([...s.data.values()][1]); expect(reviewEvent.jobs).toEqual([]);
});
it('reconciles lost receipts using the same immutable command ID without a second write', async () => {
  const s = setup(); let writes = 0;
  s.deps.set = async (key, value) => { writes++; s.data.set(key, value); throw new Error('lost receipt'); };
  const repo = createJobsRepository(s.deps); const command = jobCommand({ jobs: [job()] });
  await repo.append(command); await repo.append(command); expect(writes).toBe(1);
  await expect(repo.append({ ...command, jobs: [{ ...job(), title: 'Tampered' }] })).rejects.toThrow();
});
it('rejects foreign ownership, wrong keys and signed-out access', async () => {
  const s = setup(); await s.repo.append(jobCommand({ jobs: [job()] }));
  const [key, value] = [...s.data][0]; s.data.set(key, JSON.stringify({ ...JSON.parse(value), ownerId: 'b' }));
  await expect(s.repo.load()).rejects.toThrow(); s.switchAccount(); await expect(s.repo.load()).rejects.toThrow('Session');
});
it('rejects stale async listing results and sends no later mutation', async () => {
  const s = setup(); s.deps.list = async () => { s.switchAccount(); return []; };
  const set = vi.fn(s.deps.set); const repo = createJobsRepository({ ...s.deps, set });
  await expect(repo.append(jobCommand({ jobs: [job()] }))).rejects.toThrow('Session'); expect(set).not.toHaveBeenCalled();
});
it('detects concurrent branches and blocks subsequent writes', async () => {
  const s = setup(); await s.repo.append(jobCommand({ jobs: [job()] }));
  const original = JSON.parse([...s.data.values()][0]);
  for (const id of ['branch-1','branch-2']) s.data.set(`jp:v1:jobs:a:${id}`, JSON.stringify({ ...original, id, parentId: original.id }));
  await expect(s.repo.load()).rejects.toThrow();
  await expect(s.repo.append(jobCommand({ jobs: [job()] }))).rejects.toThrow(); expect(s.data.size).toBe(3);
});
it('requires a locking browser and fails unknown mutation outcomes closed', async () => {
  const s = setup();
  await expect(createJobsRepository({ ...s.deps, lock: undefined }).append(jobCommand({ jobs: [job()] }))).rejects.toThrow();
  s.deps.set = async () => undefined;
  await expect(createJobsRepository(s.deps).append(jobCommand({ jobs: [job()] }))).rejects.toThrow(); expect(s.data.size).toBe(0);
});
it('rejects an oversized event before writing and keeps prior history readable',async()=>{
  const s=setup();await s.repo.append(jobCommand({jobs:[job()]}));
  const jobs=Array.from({length:26},(_,n)=>({...job(),sourceId:`size-${n}`,key:`greenhouse:greenhouse:size-${n}`,url:`https://careers.example.com/size-${n}`,description:'x'.repeat(60000)}));
  await expect(s.repo.append(jobCommand({jobs}))).rejects.toThrow();expect(s.data.size).toBe(1);expect((await s.repo.load()).jobs).toHaveLength(1);
});
