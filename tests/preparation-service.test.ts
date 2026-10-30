import {expect,it,vi} from 'vitest';
import {profileFixture,jobFixture,asOf} from './fixtures/matching';
import {makeSource} from '../app/features/profile/extract';
import {defaultMatchConfig} from '../app/features/matching/engine';
import {makeBindings} from '../app/features/matching/bindings';
import {defaultSearchPreferences} from '../app/features/jobs/preferences';
import {createDraft} from '../app/features/preparation/model';
import {assessMatch} from '../app/features/matching/engine';
import {createPreparationRepository} from '../app/features/preparation/repository';
import {createPreparationService,preparationContextHash} from '../app/features/preparation/service';
async function setup(){let active=true;const p=profileFixture();p.source=await makeSource('synthetic.pdf',new Uint8Array([1]),p.source.pages.map(p=>p.text));const j=jobFixture(),preferences=defaultSearchPreferences();const config=defaultMatchConfig();const b=await makeBindings(p,j,config,preferences);let context={profile:p,job:j,preferences,match:{schemaVersion:1 as const,id:'match-1',ownerId:'a',...b,config,analyzedAt:asOf,semantic:null,mode:'deterministic' as const,model:null},review:'SHORTLISTED' as const};
 const data=new Map<string,string>();const assertSession=()=>{if(!active)throw new Error('Account changed');};const deps={ownerId:'a',assertSession,get:async(k:string)=>data.get(k)??null,set:async(k:string,v:string):Promise<boolean|undefined>=>{data.set(k,v);return true;},list:async()=>[...data].map(([key,value])=>({key,value})),lock:async<T,>(_:string,fn:()=>Promise<T>)=>fn()};const repository=createPreparationRepository(deps);const chat=vi.fn(async()=>({message:{content:JSON.stringify({version:1,parts:[{claimId:'claim-0',excerpt:'Senior React developer'}],summaryIds:['claim-0'],coverIds:['claim-0']})},finish_reason:'stop'}));
 const service=createPreparationService({ownerId:'a',assertSession,loadContext:async()=>context,repository,chat,now:()=>asOf});const draft=createDraft(p,j,assessMatch(p,j,config,asOf));
 return {service,repository,deps,data,chat,draft,context,preview:await preparationContextHash(context),switchAccount:()=>{active=false;},changeProfile:()=>{context={...context,profile:{...context.profile,id:'profile-2'}};},changeJob:()=>{context={...context,job:{...context.job,description:context.job.description+'\nChanged source'}};}};
}
it('saves immutable owner-scoped revisions and regeneration preserves originals and lineage',async()=>{
 const s=await setup(),before=JSON.stringify(s.context.profile);const a=await s.service.prepare(s.draft,false,false,s.preview,null);await s.service.save(a);const b=await s.service.prepare({...s.draft,cover:true},false,false,s.preview,a.record.id);await s.service.save(b);expect((await s.repository.list()).length).toBe(2);expect(b.record.parentId).toBe(a.record.id);expect(JSON.stringify(s.context.profile)).toBe(before);expect(s.chat).not.toHaveBeenCalled();
});
it('requires explicit consent to the exact current preview before sending private excerpts',async()=>{
 const s=await setup();await expect(s.service.prepare(s.draft,true,false,s.preview,null)).rejects.toThrow();s.changeProfile();await expect(s.service.prepare(s.draft,true,true,s.preview,null)).rejects.toThrow();expect(s.chat).not.toHaveBeenCalled();
});
it.each(['account','profile','job'] as const)('rejects stale generation after %s changes and preserves prior documents',async change=>{
 const s=await setup();const first=await s.service.prepare(s.draft,false,false,s.preview,null);await s.service.save(first);let finish!:(v:any)=>void;s.chat.mockImplementationOnce(()=>new Promise(r=>{finish=r;}));const promise=s.service.prepare(s.draft,true,true,s.preview,first.record.id);const failure=expect(promise).rejects.toThrow();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));if(change==='account')s.switchAccount();else if(change==='profile')s.changeProfile();else s.changeJob();finish({message:{content:JSON.stringify({version:1,parts:[{claimId:'claim-0',excerpt:'Senior React developer'}],summaryIds:[],coverIds:[]})},finish_reason:'stop'});await failure;expect(s.data.size).toBe(1);
});
it('rejects foreign owner and document tampering when reading history',async()=>{
 const s=await setup(),a=await s.service.prepare(s.draft,false,false,s.preview,null);await s.service.save(a);const [key,raw]=[...s.data][0];s.data.set(key,JSON.stringify({...JSON.parse(raw),ownerId:'b'}));await expect(s.repository.list()).rejects.toThrow();s.data.set(key,JSON.stringify({...JSON.parse(raw),contentHash:'f'.repeat(64)}));await expect(s.repository.list()).rejects.toThrow();
});
it('invalidates stale source versions before writes without deleting history',async()=>{
 const s=await setup(),a=await s.service.prepare(s.draft,false,false,s.preview,null);s.changeJob();await expect(s.service.save(a)).rejects.toThrow();expect(s.data.size).toBe(0);
});
it('reconciles an unchanged immutable revision after a lost write receipt',async()=>{
 const s=await setup(),a=await s.service.prepare(s.draft,false,false,s.preview,null);const repo=createPreparationRepository({...s.deps,set:async(k,v)=>{s.data.set(k,v);throw new Error('Lost response');}});await repo.save(a.record,async()=>{});await repo.save(a.record,async()=>{});expect(s.data.size).toBe(1);
});
it.each(['get','list','set'] as const)('fails closed on account changes during preparation repository %s',async method=>{
 const s=await setup(),p=await s.service.prepare(s.draft,false,false,s.preview,null);const d={...s.deps};
 if(method==='get')d.get=async()=>{s.switchAccount();return null;};if(method==='list')d.list=async()=>{s.switchAccount();return [];};if(method==='set')d.set=async(k,v)=>{s.data.set(k,v);s.switchAccount();return true;};
 const repo=createPreparationRepository(d);await expect(method==='list'?repo.list():repo.save(p.record,async()=>{})).rejects.toThrow();
});
it('blocks source validation and generation when job shortlist review is withdrawn',async()=>{
 const s=await setup();(s.context as any).review='DISMISSED';await expect(s.service.prepare(s.draft,false,false,s.preview,null)).rejects.toThrow();expect(s.data.size).toBe(0);
});
it('preserves history and refuses saves when no safe lock or confirmed readback is available',async()=>{
 const s=await setup(),p=await s.service.prepare(s.draft,false,false,s.preview,null);
 await expect(createPreparationRepository({...s.deps,lock:undefined}).save(p.record,async()=>{})).rejects.toThrow('Web Locks');
 await expect(createPreparationRepository({...s.deps,set:async()=>undefined}).save(p.record,async()=>{})).rejects.toThrow('unconfirmed');expect(s.data.size).toBe(0);
});
