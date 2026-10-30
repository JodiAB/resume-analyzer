// Read-only diagnostic. Never imported by application routes; no raw data output.
import {validId} from '../app/features/profile/schema';
const kinds=['profile','jobs','match','prep','applications'] as const;
const actions=['CREATE','REVISE','READY','APPROVE','DENY','HANDOFF','SUBMIT','STATE','TRACK'];
export function auditReleaseRecords(raw:unknown,owner:string,run:string){
 const counts=Object.fromEntries(kinds.map(k=>[k,0])),applicationEventTypes:string[]=[];let foreignOwnedRecords=0,ambiguousRecords=0;
 if(!Array.isArray(raw)||raw.length>3000||!validId(owner)||!validId(run))return {status:'BLOCKED',foreignOwnedRecords,ambiguousRecords:1,syntheticNamespaceCounts:counts,applicationEventTypes};
 for(const row of raw){
  if(!row||typeof row.key!=='string'||typeof row.value!=='string'||row.value.length>2000000){ambiguousRecords++;continue;}
  const match=/^jp:v1:(profile|jobs|match|prep|applications):([a-zA-Z0-9-]{1,100}):([a-zA-Z0-9-]{1,100})$/.exec(row.key);if(!match){ambiguousRecords++;continue;}
  let v;try{v=JSON.parse(row.value);}catch{ambiguousRecords++;continue;}
  if(!v||typeof v!=='object'||!validId(v.ownerId)){ambiguousRecords++;continue;}
  if(match[2]!==owner||v.ownerId!==owner){foreignOwnedRecords++;continue;}
  const belongs=typeof v.id==='string'&&v.id.startsWith(`m6-${run}-`)||v.applicationId===`m6-${run}-app`;
  if(!belongs)continue;counts[match[1]]++;
  if(match[1]==='applications')applicationEventTypes.push(actions.includes(v.action?.type)?v.action.type:'UNRECOGNIZED');
 }
 return {status:foreignOwnedRecords?'FAIL':ambiguousRecords||kinds.some(k=>counts[k]===0)?'BLOCKED':'PASS',foreignOwnedRecords,ambiguousRecords,syntheticNamespaceCounts:counts,applicationEventTypes};
}
