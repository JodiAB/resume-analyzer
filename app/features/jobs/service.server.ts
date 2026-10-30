import { getBoard } from './boards';
import { normalizePosting } from './adapters.server';
import { id, isObject, type Job } from './model';
import { createPublicTransport, SourceError, type PublicFetch } from './transport.server';
export interface DiscoveryPage { jobs: Job[]; checkedAt: string; nextOffset: number | null; complete: boolean; missing: boolean }
export function createJobService(options: { fetch?: PublicFetch; now?: () => string; pageSize?: number; timeoutMs?: number } = {}) {
  const transport = createPublicTransport({ fetch: options.fetch, timeoutMs: options.timeoutMs });
  const cache = new Map<string, { expires: number; page: DiscoveryPage }>();
  const cooldown = new Map<string, number>(); let active = 0; let windowStart = 0; let requests = 0;
  const discover = async (input: { source: string; board: string; offset?: number; id?: string }): Promise<DiscoveryPage> => {
    let board;try{board=getBoard(input.source,input.board);}catch{throw new SourceError('INVALID_QUERY');}
    const offset = input.offset ?? 0; const size = options.pageSize ?? 20;
    if (!Number.isInteger(offset) || offset < 0 || offset > 1000 || (input.id !== undefined && !id(input.id))) throw new SourceError('INVALID_QUERY');
    const now = (options.now || (() => new Date().toISOString()))(); const time = Date.parse(now);
    const key = `${board.source}:${board.board}:${input.id || offset}`; const cached = cache.get(key);
    if (!input.id && cached && cached.expires > time) return structuredClone(cached.page);
    const boardKey = `${board.source}:${board.board}`;
    if ((cooldown.get(boardKey) || 0) > time) throw new SourceError('RATE_LIMITED', Math.ceil((cooldown.get(boardKey)! - time) / 1000));
    if (time - windowStart > 60000) { windowStart = time; requests = 0; }
    if (active >= 4 || ++requests > 30) throw new SourceError('LOCAL_RATE_LIMIT', 60);
    active++;
    try {
      const url = board.source === 'greenhouse' ? `https://boards-api.greenhouse.io/v1/boards/${board.board}/jobs${input.id ? '/' + input.id : ''}?content=true${input.id?'&pay_transparency=true':''}` : board.source === 'lever' ? `https://api.lever.co/v0/postings/${board.board}${input.id ? '/' + input.id : ''}?mode=json${input.id ? '' : `&skip=${offset}&limit=${size}`}` : `https://api.ashbyhq.com/posting-api/job-board/${board.board}?includeCompensation=true`;
      let raw: unknown;
      try { raw = await transport.get(url); } catch (error) {
        if (error instanceof SourceError && error.code === 'NOT_FOUND' && input.id && board.source !== 'ashby') return { jobs: [], checkedAt: now, nextOffset: null, complete: true, missing: true };
        if (error instanceof SourceError && error.retryAfter) cooldown.set(boardKey, time + error.retryAfter * 1000);
        throw error;
      }
      const singleton = !!input.id && board.source !== 'ashby';
      const items = singleton ? [raw] : board.source === 'lever' ? raw : isObject(raw) ? raw.jobs : null;
      if (!Array.isArray(items) || items.length > 1000) throw new SourceError('INVALID_SOURCE_FORMAT');
      if(!singleton&&board.source==='greenhouse'&&isObject(raw)&&isObject(raw.meta)&&typeof raw.meta.total==='number'&&raw.meta.total!==items.length)throw new SourceError('INCOMPLETE_SOURCE');
      // Validate the full returned board before considering absence evidence.
      const all = items.map(item => normalizePosting(board, item, now)).filter((j): j is Job => !!j);
      if (input.id) {
        const selected = all.filter(j => j.sourceId === input.id);
        if (singleton && selected.length !== 1) throw new SourceError('MISMATCHED_SOURCE_ID');
        // An unlisted Ashby posting can still accept applications via a direct
        // link. Do not expose its fields or mistake visibility for closure.
        const hiddenOrAmbiguous=board.source==='ashby'&&items.some(item=>isObject(item)&&item.isListed===false&&(String(item.id??'')===input.id||!id(item.id)));
        return { jobs: selected, checkedAt: now, nextOffset: null, complete: true, missing: !selected.length&&!hiddenOrAmbiguous };
      }
      const jobs = board.source === 'lever' ? all : all.slice(offset, offset + size);
      const next = board.source === 'lever' ? items.length >= size ? offset + size : null : offset + size < all.length ? offset + size : null;
      const page = { jobs, checkedAt: now, nextOffset: next !== null && next <= 1000 ? next : null, complete: next === null, missing: false };
      if (cache.size >= 64) cache.delete(cache.keys().next().value!);
      cache.set(key, { expires: time + 60000, page: structuredClone(page) }); return page;
    } finally { active--; }
  };
  return { discover };
}
export const publicJobService = createJobService();
