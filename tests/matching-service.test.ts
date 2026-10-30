import {expect,it,vi} from 'vitest';
import {createMatchService} from '../app/features/matching/service';
import {createMatchRepository} from '../app/features/matching/repository';
import {defaultMatchConfig} from '../app/features/matching/engine';
import {makeSource} from '../app/features/profile/extract';
import {profileFixture,jobFixture,asOf} from './fixtures/matching';
async function setup(){
  let active=true;let profile=profileFixture();profile.source=await makeSource('synthetic.pdf',new Uint8Array([1]),profile.source.pages.map(p=>p.text));let job=jobFixture();const data=new Map<string,string>();
  const assertSession=()=>{if(!active)throw new Error('Session changed');};
  const deps={ownerId:'a',assertSession,get:async(k:string)=>data.get(k)??null,set:async(k:string,v:string):Promise<boolean|undefined>=>{data.set(k,v);return true;},list:async()=>[...data].map(([key,value])=>({key,value})),lock:async<T,>(_:string,work:()=>Promise<T>)=>work()};
  const repository=createMatchRepository(deps);
  const chat=vi.fn(async()=>({message:{content:JSON.stringify({version:1,links:[],unresolvedRequirementIds:[]}),refusal:null},finish_reason:'stop'}));
  const service=createMatchService({ownerId:'a',assertSession,loadContext:async()=>({profile,job}),chat,repository,now:()=>asOf});
  return {service,repository,data,deps,chat,switchAccount:()=>{active=false;},changeProfile:()=>{profile={...profile,id:'profile-2'};},changeJob:()=>{job={...job,title:'Changed job'};}};
}
it('persists only immutable owner-bound result inputs and recomputes verified scores',async()=>{
  const s=await setup();const result=await s.service.analyze(defaultMatchConfig(),false,false);expect(result.assessment.score).toBe(100);
  await s.service.save(result);await s.service.save(result);expect(s.data.size).toBe(1);
  const record=(await s.repository.list())[0];expect(record.ownerId).toBe('a');expect(record).not.toHaveProperty('score');expect(record).not.toHaveProperty('profile');
  expect((await s.service.resolve(record))?.score).toBe(100);expect(s.chat).not.toHaveBeenCalled();
});
it('requires explicit semantic consent, validates model results and never uses paid retries automatically',async()=>{
  const s=await setup();await expect(s.service.analyze(defaultMatchConfig(),true,false)).rejects.toThrow();expect(s.chat).not.toHaveBeenCalled();
  await s.service.analyze(defaultMatchConfig(),true,true);expect(s.chat).toHaveBeenCalledTimes(1);
  s.chat.mockResolvedValueOnce({message:{content:'not JSON',refusal:null},finish_reason:'stop'});
  await expect(s.service.analyze(defaultMatchConfig(),true,true)).rejects.toThrow();expect(s.data.size).toBe(0);
});
it.each(['profile','job','account'] as const)('rejects stale model completion after %s changes and writes nothing',async change=>{
  const s=await setup();let finish!:(v:any)=>void;s.chat.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  const pending=s.service.analyze(defaultMatchConfig(),true,true);const failure=expect(pending).rejects.toThrow();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
  if(change==='profile')s.changeProfile();else if(change==='job')s.changeJob();else s.switchAccount();
  finish({message:{content:JSON.stringify({version:1,links:[],unresolvedRequirementIds:[]}),refusal:null},finish_reason:'stop'});await failure;expect(s.data.size).toBe(0);
});
it('invalidates old results after a profile change and refuses their save',async()=>{
  const s=await setup();const result=await s.service.analyze(defaultMatchConfig(),false,false);await s.service.save(result);s.changeProfile();
  expect(await s.service.resolve(result.record)).toBeNull();await expect(s.service.save(result)).rejects.toThrow();
});
it('checks source identity again after a pending persistence write',async()=>{
  const s=await setup();const result=await s.service.analyze(defaultMatchConfig(),false,false);s.deps.set=async(k,v)=>{s.data.set(k,v);s.changeProfile();return true;};
  const repository=createMatchRepository(s.deps);await expect(repository.save(result.record,async()=>{if(!await s.service.resolve(result.record))throw new Error('Context changed');})).rejects.toThrow();
});
it('rejects foreign ownership, tampered config hashes and ambiguous saves without deleting history',async()=>{
  const s=await setup();const result=await s.service.analyze(defaultMatchConfig(),false,false);await s.service.save(result);
  const [key,raw]=[...s.data][0];s.data.set(key,JSON.stringify({...JSON.parse(raw),ownerId:'b'}));await expect(s.repository.list()).rejects.toThrow();
  s.data.set(key,JSON.stringify({...JSON.parse(raw),configHash:'c'.repeat(64)}));await expect(s.repository.list()).rejects.toThrow();
});
it.each(['get','list','set'] as const)('fails closed when account changes during match repository %s',async method=>{
 const s=await setup();const p=await s.service.analyze(defaultMatchConfig(),false,false);const d={...s.deps};
 if(method==='get')d.get=async()=>{s.switchAccount();return null;};
 if(method==='list')d.list=async()=>{s.switchAccount();return [];};
 if(method==='set')d.set=async(k,v)=>{s.data.set(k,v);s.switchAccount();return true;};
 const repo=createMatchRepository(d);await expect(method==='list'?repo.list():repo.save(p.record,async()=>{})).rejects.toThrow();
});
it('reconciles a lost save receipt by exact immutable ID without another AI call',async()=>{
 const s=await setup();const p=await s.service.analyze(defaultMatchConfig(),true,true);const repo=createMatchRepository({...s.deps,set:async(k,v)=>{s.data.set(k,v);throw new Error('Lost receipt');}});
 await repo.save(p.record,async()=>{});await repo.save(p.record,async()=>{});expect(s.data.size).toBe(1);expect(s.chat).toHaveBeenCalledTimes(1);
 await expect(repo.save({...p.record,analyzedAt:'2026-10-28T11:59:00.000Z'},async()=>{})).rejects.toThrow('Immutable');
});
it('refuses ambiguous persistence and missing Web Locks without displaying a confirmed save',async()=>{
 const s=await setup();const p=await s.service.analyze(defaultMatchConfig(),false,false);
 await expect(createMatchRepository({...s.deps,set:async()=>undefined}).save(p.record,async()=>{})).rejects.toThrow('unconfirmed');
 await expect(createMatchRepository({...s.deps,lock:undefined}).save(p.record,async()=>{})).rejects.toThrow('Web Locks');expect(s.data.size).toBe(0);
});
it('rejects a changed consent preview before sending any new private text to AI',async()=>{
 const s=await setup();const preview=await s.service.analyze(defaultMatchConfig(),false,false);s.changeProfile();
 await expect(s.service.analyze(defaultMatchConfig(),true,true,preview.record)).rejects.toThrow('Preview changed');expect(s.chat).not.toHaveBeenCalled();expect(s.data.size).toBe(0);
});
