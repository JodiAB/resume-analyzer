import {captureSession,usePuterStore} from '../../lib/puter';
import {validId} from '../profile/schema';
import {isObject} from '../jobs/model';
import {fingerprint} from '../matching/bindings';
import {validatePreparationRecord,type PreparationRecord} from './records';
interface Dependencies {ownerId:string;assertSession:()=>void;get:(key:string)=>Promise<string|null|undefined>;set:(key:string,value:string)=>Promise<boolean|undefined>;list:(pattern:string,values:boolean)=>Promise<unknown>;lock?:<T>(name:string,work:()=>Promise<T>)=>Promise<T>}
export function createPreparationRepository(d:Dependencies){
 if(!validId(d.ownerId))throw new Error('Verified preparation owner required');const prefix=`jp:v1:prep:${d.ownerId}:`;
 const parse=async(raw:string,key:string)=>{if(raw.length>1500000)throw new Error('Preparation record limit');const record=await validatePreparationRecord(JSON.parse(raw),d.ownerId);d.assertSession();if(key!==prefix+record.id)throw new Error('Preparation key mismatch');return record;};
 const list=async()=>{d.assertSession();const items=await d.list(prefix+'*',true);d.assertSession();if(!Array.isArray(items)||items.length>100)throw new Error('Unverified preparation history/capacity');let size=0;const records:PreparationRecord[]=[];
  for(const item of items){if(!isObject(item)||typeof item.key!=='string'||typeof item.value!=='string')throw new Error('Invalid preparation list');size+=item.value.length;if(size>10000000)throw new Error('Preparation history size limit');records.push(await parse(item.value,item.key));d.assertSession();}
  if(new Set(records.map(r=>r.id)).size!==records.length)throw new Error('Duplicate preparation IDs');for(const r of records)if(r.parentId){const parent=records.find(p=>p.id===r.parentId);if(!parent||parent.context.job.key!==r.context.job.key||Date.parse(parent.createdAt)>Date.parse(r.createdAt))throw new Error('Invalid preparation lineage');const seen=new Set([r.id]);let p:PreparationRecord|undefined=r;while(p?.parentId){if(seen.has(p.parentId))throw new Error('Preparation cycle');seen.add(p.parentId);p=records.find(r=>r.id===p!.parentId);}}
  return records;
 };
 const save=async(input:PreparationRecord,assertCurrent:()=>Promise<void>)=>{d.assertSession();if(!d.lock)throw new Error('Web Locks required');const key=prefix+input.id,raw=JSON.stringify(input),record=await parse(raw,key);d.assertSession();
  return d.lock(`jobpilot:${d.ownerId}:preparation`,async()=>{d.assertSession();await assertCurrent();d.assertSession();const old=await d.get(key);d.assertSession();if(old===undefined)throw new Error('Preparation absence unknown');if(old!==null){const existing=await parse(old,key);if(await fingerprint(existing)!==await fingerprint(record))throw new Error('Immutable preparation mismatch');await assertCurrent();d.assertSession();return existing;}
   const history=await list();d.assertSession();if(history.length>=100||history.reduce((n,r)=>n+JSON.stringify(r).length,0)+raw.length>10000000)throw new Error('Preparation capacity reached; history retained');if(record.parentId){const p=history.find(r=>r.id===record.parentId);if(!p||p.context.job.key!==record.context.job.key||Date.parse(p.createdAt)>Date.parse(record.createdAt))throw new Error('Unverified parent revision');}
   await assertCurrent();d.assertSession();try{await d.set(key,raw);}catch{/* reconcile exact immutable ID without repeating AI */}d.assertSession();const receipt=await d.get(key);d.assertSession();if(receipt!==raw)throw new Error('Preparation save unconfirmed; retry unchanged revision');await assertCurrent();d.assertSession();return record;
  });
 };return {list,save};
}
export function currentPreparationRepository(){const a=captureSession(),s=usePuterStore.getState(),locks=typeof navigator!=='undefined'?navigator.locks:undefined;return createPreparationRepository({ownerId:s.auth.user!.uuid,assertSession:a,get:s.kv.get,set:s.kv.set,list:s.kv.list,lock:locks?(name,fn)=>locks.request(name,fn):undefined});}
