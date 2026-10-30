import { publicJobService } from '../features/jobs/service.server';
import { SourceError } from '../features/jobs/transport.server';
export async function loader({ request }: { request: Request }) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  try {
    if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'GET_ONLY' }), { status: 405, headers });
    const q = new URL(request.url).searchParams;
    if ([...q.keys()].some(k => !['source','board','offset','id'].includes(k)) || [...q.keys()].some(k => q.getAll(k).length !== 1) || (q.has('offset') && !/^\d{1,4}$/.test(q.get('offset')!))) return new Response(JSON.stringify({ error: 'INVALID_QUERY' }), { status: 400, headers });
    const page = await publicJobService.discover({ source: q.get('source') || '', board: q.get('board') || '', ...(q.has('offset') ? { offset: Number(q.get('offset')) } : {}), ...(q.has('id') ? { id: q.get('id')! } : {}) });
    return new Response(JSON.stringify(page), { headers });
  } catch (error) {
    const code = error instanceof SourceError ? error.code : 'SOURCE_ERROR';
    const retry = error instanceof SourceError ? error.retryAfter : 0;
    return new Response(JSON.stringify({ error: code, status: 'SOURCE_ERROR' }), { status: /RATE_LIMIT/.test(code) ? 429 : code==='INVALID_QUERY'?400:502, headers: { ...headers, ...(retry ? { 'Retry-After': String(retry) } : {}) } });
  }
}
export function action(){return new Response(JSON.stringify({error:'GET_ONLY'}),{status:405,headers:{Allow:'GET','Content-Type':'application/json','Cache-Control':'no-store'}});}
