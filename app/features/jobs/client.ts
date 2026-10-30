import { captureSession, usePuterStore } from '../../lib/puter';
import { getBoard } from './boards';
import { id, isObject, timestamp, validateJob, type Job } from './model';
export interface PublicPage { jobs: Job[]; checkedAt: string; nextOffset: number | null; complete: boolean; missing: boolean }
export async function fetchJobs(input: { source: string; board: string; offset?: number; id?: string }): Promise<PublicPage> {
  const assertSession = captureSession(); getBoard(input.source, input.board);
  if (input.id !== undefined && !id(input.id)) throw new Error('Invalid job ID');
  const q = new URLSearchParams({ source: input.source, board: input.board });
  if (input.id) q.set('id', input.id); if (input.offset !== undefined) q.set('offset', String(input.offset));
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
  const work=async():Promise<PublicPage>=>{
  await usePuterStore.getState().auth.refreshUser();assertSession();
  const response = await fetch(`/api/jobs?${q}`, { method: 'GET', credentials: 'omit', signal: controller.signal }); assertSession();
  if (!response.ok) {
    const retry = Number(response.headers.get('retry-after'));
    throw new Error(response.status === 429 ? `Rate limited. Wait ${Number.isFinite(retry) && retry > 0 ? retry : 60} seconds before retrying.` : 'Source unavailable; saved jobs were retained.');
  }
  if(!response.body||Number(response.headers.get('content-length'))>1500000)throw new Error('Discovery response size limit');
  reader=response.body.getReader();const chunks:Uint8Array[]=[];let length=0;
  while(true){const part=await reader.read();assertSession();if(part.done)break;length+=part.value.byteLength;if(length>1500000)throw new Error('Discovery response size limit');chunks.push(part.value);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);assertSession();
  const v: unknown = JSON.parse(raw);
  if (!isObject(v) || !Array.isArray(v.jobs) || v.jobs.length > 200 || !timestamp(v.checkedAt) || typeof v.complete !== 'boolean' || typeof v.missing !== 'boolean' || (v.nextOffset !== null && (!Number.isInteger(v.nextOffset) || (v.nextOffset as number) < 0 || (v.nextOffset as number) > 1000))) throw new Error('Invalid discovery response');
  const jobs = v.jobs.map(validateJob);
  if (jobs.some(j => j.source !== input.source || j.board !== input.board || (input.id && j.sourceId !== input.id)) || (v.missing && (jobs.length || !input.id || !v.complete))) throw new Error('Mismatched discovery evidence');
  await usePuterStore.getState().auth.refreshUser();assertSession(); return { jobs, checkedAt: v.checkedAt, nextOffset: v.nextOffset as number | null, complete: v.complete, missing: v.missing };
  };
  try{return await Promise.race([work(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Discovery request timed out'));},12000);})]);}
  finally{clearTimeout(timer);controller.abort();void reader?.cancel().catch(()=>{});}
}
