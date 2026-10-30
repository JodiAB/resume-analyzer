import {captureSession,usePuterStore} from '../../lib/puter';
import {validId} from '../profile/schema';
import {isObject,text,timestamp} from '../jobs/model';
import {validateMatchConfig} from './engine';
import {fingerprint,type MatchRecord} from './bindings';
interface Dependencies {ownerId:string;assertSession:()=>void;get:(key:string)=>Promise<string|null|undefined>;set:(key:string,value:string)=>Promise<boolean|undefined>;list:(pattern:string,values:boolean)=>Promise<unknown>;lock?:<T>(name:string,work:()=>Promise<T>)=>Promise<T>}
export function createMatchRepository(d:Dependencies){
  if(!validId(d.ownerId))throw new Error('Verified match owner required');const prefix=`jp:v1:match:${d.ownerId}:`;
  const parse=async(raw:string,key:string):Promise<MatchRecord>=>{
    if(raw.length>100000)throw new Error('Match record size limit');const v:unknown=JSON.parse(raw);
    const fields=['schemaVersion','id','ownerId','profileId','profileHash','jobKey','jobHash','configHash','preferencesHash','config','analyzedAt','semantic','mode','model'];
    if(!isObject(v)||Object.keys(v).length!==fields.length||fields.some(k=>!(k in v))||v.schemaVersion!==1||!validId(v.id)||!validId(v.profileId)||v.ownerId!==d.ownerId||key!==prefix+v.id||typeof v.jobKey!=='string'||!/^(?:greenhouse|lever|ashby|manual):[a-zA-Z0-9_-]{1,100}:[a-zA-Z0-9_-]{1,100}$/.test(v.jobKey)||!timestamp(v.analyzedAt)||!['deterministic','puter-ai'].includes(v.mode as string))throw new Error('Invalid match ownership or schema');
    for(const k of ['profileHash','jobHash','configHash','preferencesHash'])if(typeof v[k]!=='string'||!/^[a-f0-9]{64}$/.test(v[k]))throw new Error('Invalid match binding');
    const config=validateMatchConfig(v.config);if(await fingerprint(config)!==v.configHash)throw new Error('Match config integrity failure');d.assertSession();
    if(v.mode==='deterministic'&&(v.semantic!==null||v.model!==null)||v.mode==='puter-ai'&&(v.semantic===null||v.model!=='grok-3'))throw new Error('Invalid model provenance');
    if(v.semantic!==null){const s=v.semantic;if(!isObject(s)||Object.keys(s).length!==3||s.version!==1||!Array.isArray(s.links)||s.links.length>60||!Array.isArray(s.unresolvedRequirementIds)||s.unresolvedRequirementIds.length>100||!s.unresolvedRequirementIds.every(id=>text(id,100)))throw new Error('Invalid stored semantic schema');for(const l of s.links)if(!isObject(l)||Object.keys(l).length!==5||!text(l.requirementId,100)||!text(l.claimId,100)||!text(l.jobQuote,2000)||!text(l.candidateQuote,2000)||!['EXACT','TRANSFERABLE','PROJECT','CONTEXT'].includes(l.relation as string))throw new Error('Invalid stored semantic link');}
    return {...v,config} as unknown as MatchRecord;
  };
  const history=async()=>{d.assertSession();const items=await d.list(prefix+'*',true);d.assertSession();if(!Array.isArray(items)||items.length>200)throw new Error('Unable to verify match history');let size=0;const records:MatchRecord[]=[];for(const item of items){if(!isObject(item)||typeof item.key!=='string'||typeof item.value!=='string')throw new Error('Invalid match list');size+=item.value.length;if(size>5000000)throw new Error('Match history size limit');records.push(await parse(item.value,item.key));d.assertSession();}if(new Set(records.map(r=>r.id)).size!==records.length)throw new Error('Duplicate match records');return {records,size};};
  const list=async()=>{const h=await history();return h.records;};
  const save=async(input:MatchRecord,assertContext:()=>Promise<void>)=>{
    d.assertSession();const key=prefix+input.id;const record=await parse(JSON.stringify(input),key);d.assertSession();if(!d.lock)throw new Error('Web Locks required for safe match persistence');
    return d.lock(`jobpilot:${d.ownerId}:matches`,async()=>{d.assertSession();await assertContext();d.assertSession();const existing=await d.get(key);d.assertSession();const raw=JSON.stringify(record);
      if(existing===undefined)throw new Error('Unable to verify match absence');if(existing!==null){const old=await parse(existing,key);if(JSON.stringify(old)!==raw)throw new Error('Immutable match mismatch');await assertContext();d.assertSession();return old;}
      const state=await history();d.assertSession();if(state.records.length>=200||state.size+raw.length>5000000)throw new Error('Match capacity reached before write; history retained');await assertContext();d.assertSession();
      try{await d.set(key,raw);}catch{/* A response can be lost after a commit. Reconcile the exact immutable ID. */}
      d.assertSession();const readback=await d.get(key);d.assertSession();if(readback!==raw)throw new Error('Match save unconfirmed; retry this exact record');await assertContext();d.assertSession();return record;
    });
  };
  return {list,save};
}
export function currentMatchRepository(){const assertSession=captureSession(),s=usePuterStore.getState(),locks=typeof navigator!=='undefined'?navigator.locks:undefined;return createMatchRepository({ownerId:s.auth.user!.uuid,assertSession,get:s.kv.get,set:s.kv.set,list:s.kv.list,lock:locks?(name,work)=>locks.request(name,work):undefined});}
