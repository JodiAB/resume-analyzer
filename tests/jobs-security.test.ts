import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { currentJobsRepository, jobCommand } from '../app/features/jobs/repository';
import { usePuterStore } from '../app/lib/puter';
import { fetchJobs } from '../app/features/jobs/client';
import { normalizePosting } from '../app/features/jobs/adapters.server';
import { getBoard } from '../app/features/jobs/boards';
import { gh, checked } from './fixtures/jobs';
let owner:string;let sdk:any;
const initial=usePuterStore.getState();
const page=()=>({jobs:[normalizePosting(getBoard('greenhouse','greenhouse'),gh,checked)!],checkedAt:checked,nextOffset:null,complete:true,missing:false});
beforeEach(async()=>{
  owner='a';sdk={auth:{isSignedIn:async()=>true,getUser:async()=>({uuid:owner,username:'Synthetic'})},kv:{list:vi.fn(async()=>[]),get:vi.fn(async()=>null),set:vi.fn(async()=>true)}};window.puter=sdk;
  Object.defineProperty(navigator,'locks',{configurable:true,value:{request:(_:string,work:()=>unknown)=>work()}});
  await usePuterStore.getState().auth.checkAuthStatus();
});
afterEach(()=>{usePuterStore.setState(initial);vi.unstubAllGlobals();});
it.each(['list','get','set'] as const)('rejects stale saved-job %s completion through the actual guarded Puter adapter',async operation=>{
  let finish!:(v:any)=>void;sdk.kv[operation].mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  const repo=currentJobsRepository();const pending=operation==='list'?repo.load():repo.append(jobCommand({jobs:page().jobs}));
  const failure=expect(pending).rejects.toThrow('Session');await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));owner='b';finish(operation==='list'?[]:operation==='get'?null:true);await failure;
  expect(usePuterStore.getState().auth.isAuthenticated).toBe(false);if(operation!=='set')expect(sdk.kv.set).not.toHaveBeenCalled();
});
it('revalidates SDK identity before delivering a public result into account-dependent UI state',async()=>{
  let finish!:(v:Response)=>void;vi.stubGlobal('fetch',vi.fn(()=>new Promise(resolve=>{finish=resolve;})));
  const pending=fetchJobs({source:'greenhouse',board:'greenhouse'});const failure=expect(pending).rejects.toThrow('Session');
  await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));owner='b';finish(new Response(JSON.stringify(page())));await failure;
});
it('sends only board identifiers to the public route, never profile preferences or SDK credentials',async()=>{
  const fetch=vi.fn(async(..._args:unknown[])=>new Response(JSON.stringify(page())));vi.stubGlobal('fetch',fetch);
  await fetchJobs({source:'greenhouse',board:'greenhouse'});
  expect(fetch.mock.calls[0][0]).toBe('/api/jobs?source=greenhouse&board=greenhouse');
  expect(fetch.mock.calls[0][1]).toMatchObject({credentials:'omit',method:'GET'});
});
it('rejects mismatched source evidence and stops consuming an oversized response body',async()=>{
  vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({...page(),jobs:[{...page().jobs[0],board:'other',key:'greenhouse:other:123'}]})));
  await expect(fetchJobs({source:'greenhouse',board:'greenhouse'})).rejects.toThrow();
  let reads=0;let cancelled=false;
  const body=new ReadableStream<Uint8Array>({pull(controller){reads++;if(reads<=21)controller.enqueue(new Uint8Array(100000).fill(32));else controller.close();},cancel(){cancelled=true;}});
  vi.stubGlobal('fetch',async()=>new Response(body));
  await expect(fetchJobs({source:'greenhouse',board:'greenhouse'})).rejects.toThrow();
  expect(reads).toBeLessThanOrEqual(18);expect(cancelled).toBe(true);
});
