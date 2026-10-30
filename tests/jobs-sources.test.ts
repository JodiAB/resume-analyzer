// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { normalizePosting } from '../app/features/jobs/adapters.server';
import { getBoard } from '../app/features/jobs/boards';
import { createJobService } from '../app/features/jobs/service.server';
import { createPublicTransport } from '../app/features/jobs/transport.server';
import { gh, lever, ashby, checked } from './fixtures/jobs';
const json = (v: unknown, status = 200, headers = {}) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json', ...headers } });
it('normalizes all three documented public sources and retains publication provenance', () => {
  const g = normalizePosting(getBoard('greenhouse', 'greenhouse'), gh, checked)!;
  expect(g.publicationKind).toBe('FIRST_PUBLISHED'); expect(g.description).not.toContain('&lt;'); expect(g.skills).toContain('React');
  const l = normalizePosting(getBoard('lever', 'lever'), lever, checked)!;
  expect(l.publishedAt).toBeNull(); expect(l.updatedAt).toBeNull(); expect(l.salary[0]).toEqual({ min: 40000, max: 60000, currency: 'USD', period: 'year' }); expect(l.skills).toContain('Node.js');
  const a = normalizePosting(getBoard('ashby', 'Ashby'), ashby, checked)!;
  expect(a.publicationKind).toBe('LAST_PUBLISHED'); expect(a.salary[0].min).toBe(50000);
  expect(normalizePosting(getBoard('ashby', 'Ashby'), { ...ashby, isListed: false }, checked)).toBeNull();
});
it('does not interpret Ashby hybrid isRemote as fully remote or updated time as publication', () => {
  expect(normalizePosting(getBoard('ashby', 'Ashby'), { ...ashby, workplaceType: 'Hybrid' }, checked)?.remote).toBe('HYBRID');
  const j = normalizePosting(getBoard('greenhouse', 'greenhouse'), { ...gh, first_published: undefined }, checked)!;
  expect(j.publicationKind).toBe('UNKNOWN'); expect(j.updatedAt).toBe(checked);
});
it.each(['Hybrid / Remote','Remote not available'])('does not classify ambiguous or negated location text as fully remote: %s',location=>{
  expect(normalizePosting(getBoard('greenhouse','greenhouse'),{...gh,location:{name:location}},checked)?.remote).not.toBe('REMOTE');
});
it('captures Greenhouse disclosed pay cents without inventing an undocumented pay period',()=>{
  const j=normalizePosting(getBoard('greenhouse','greenhouse'),{...gh,pay_input_ranges:[{min_cents:5000000,max_cents:7500000,currency_type:'USD',title:'NYC band',blurb:'Disclosed pay'}]},checked)!;
  expect(j.salary).toEqual([{min:50000,max:75000,currency:'USD',period:'unknown'}]);
});
it.each([null, {}, { ...gh, absolute_url: 'javascript:alert(1)' }, { ...gh, id: '../escape' }])('rejects malformed or unsafe source records', raw => {
  expect(() => normalizePosting(getBoard('greenhouse', 'greenhouse'), raw, checked)).toThrow();
});
it('honors Lever pagination and does not label a full page complete', async () => {
  const requests: string[] = [];
  const service = createJobService({ fetch: async (url) => { requests.push(String(url)); return json([lever]); }, now: () => checked, pageSize: 1 });
  const page = await service.discover({ source: 'lever', board: 'lever', offset: 2 });
  expect(new URL(requests[0]).searchParams.get('skip')).toBe('2'); expect(page.nextOffset).toBe(3); expect(page.complete).toBe(false);
});
it('fails a malformed page rather than claiming completeness or closed jobs', async () => {
  const service = createJobService({ fetch: async () => json({ jobs: [ashby, { title: 'bad' }] }), now: () => checked });
  await expect(service.discover({ source: 'ashby', board: 'Ashby', offset: 0 })).rejects.toThrow();
});
it('does not claim a Greenhouse board is complete when total metadata exceeds returned records',async()=>{
  const service=createJobService({fetch:async()=>json({jobs:[gh],meta:{total:2}}),now:()=>checked});
  await expect(service.discover({source:'greenhouse',board:'greenhouse'})).rejects.toThrow();
});
it('caches public pages and observes provider cooldown before another upstream request',async()=>{
  const fetch=vi.fn(async()=>json({},429,{'retry-after':'60'}));const service=createJobService({fetch,now:()=>checked});
  await expect(service.discover({source:'lever',board:'lever'})).rejects.toThrow();
  await expect(service.discover({source:'lever',board:'lever'})).rejects.toThrow();expect(fetch).toHaveBeenCalledTimes(1);
  const ok=vi.fn(async()=>json([]));const cached=createJobService({fetch:ok,now:()=>checked});
  await cached.discover({source:'lever',board:'lever'});await cached.discover({source:'lever',board:'lever'});expect(ok).toHaveBeenCalledTimes(1);
});
it('uses explicit individual missing replies for closure; a board outage is not closure', async () => {
  const absent = createJobService({ fetch: async () => json({}, 404), now: () => checked });
  expect((await absent.discover({ source: 'lever', board: 'lever', id: 'missing' })).missing).toBe(true);
  await expect(absent.discover({ source: 'ashby', board: 'Ashby', id: 'missing' })).rejects.toThrow();
  const empty = createJobService({ fetch: async () => json({ jobs: [] }), now: () => checked });
  expect((await empty.discover({ source: 'ashby', board: 'Ashby', id: 'missing' })).missing).toBe(true);
});
it('does not call a still-published but unlisted Ashby posting closed',async()=>{
  const service=createJobService({fetch:async()=>json({jobs:[{...ashby,isListed:false}]}),now:()=>checked});
  const result=await service.discover({source:'ashby',board:'Ashby',id:'ashby-job'});
  expect(result.jobs).toEqual([]);expect(result.missing).toBe(false);
});
it('caps requests, rejects redirect responses and does not forward browser credentials', async () => {
  const fetch = vi.fn(async (_url, options) => { expect(options.redirect).toBe('error'); expect(options.credentials).toBe('omit'); expect(options.headers).toEqual({ Accept: 'application/json' }); return json({ jobs: [] }); });
  const transport = createPublicTransport({ fetch });
  await transport.get('https://boards-api.greenhouse.io/v1/boards/greenhouse/jobs');
  await expect(transport.get('https://127.0.0.1/private')).rejects.toThrow();
  await expect(transport.get('https://boards-api.greenhouse.io.evil.test/jobs')).rejects.toThrow(); expect(fetch).toHaveBeenCalledTimes(1);
});
it('respects Retry-After without immediate retries or bypassing provider rate limits', async () => {
  const fetch = vi.fn(async () => json({}, 429, { 'retry-after': '60' }));
  const t = createPublicTransport({ fetch });
  await expect(t.get('https://api.lever.co/v0/postings/lever')).rejects.toMatchObject({ code: 'RATE_LIMITED', retryAfter: 60 });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('rejects oversized, redirected and invalid JSON responses', async () => {
  for (const response of [new Response('x'.repeat(101), { headers: { 'content-type': 'application/json' } }), new Response('{}', { status: 302 }), new Response('<html>', { headers: { 'content-type': 'text/html' } })]) {
    const t = createPublicTransport({ fetch: async () => response, maxBytes: 100 });
    await expect(t.get('https://api.lever.co/v0/postings/lever')).rejects.toThrow();
  }
});
it('fails closed on unconfigured boards or URL-like parameters before fetching', async () => {
  const fetch = vi.fn(); const service = createJobService({ fetch, now: () => checked });
  for (const input of [{ source: 'lever', board: 'https://127.0.0.1' }, { source: 'lever', board: 'lever', id: '../x' }, { source: 'ashby', board: 'Ashby', offset: -1 }]) await expect(service.discover(input)).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});
it('times out a stalled response body and propagates source outages', async () => {
  const fetch: typeof globalThis.fetch = async (_url, options) => { await new Promise((_, reject) => options?.signal?.addEventListener('abort', () => reject(new Error('aborted')))); return json({}); };
  await expect(createPublicTransport({ fetch, timeoutMs: 10 }).get('https://api.lever.co/v0/postings/lever')).rejects.toThrow();
});
