// Synthetic acceptance fixtures only. Never imported by application routes.
import {applicationPreparation} from '../tests/fixtures/application';
import {validId} from '../app/features/profile/schema';
import {makeBindings} from '../app/features/matching/bindings';
import {preparationContextHash,validatePreparationRecord} from '../app/features/preparation/records';
import {makeApplicationPackage,applicationCommand} from '../app/features/applications/model';
export interface ReleaseEntry {kind:string;key:string;value:string}
export async function buildReleaseFixture(ownerId:string,run:string,now:string){
 if(!validId(ownerId)||!validId(run))throw new Error('Explicit owner and safe run required');
 const p=await applicationPreparation();p.id=`m6-${run}-prep`;p.ownerId=ownerId;p.createdAt=now;
 const {profile,job,match}=p.context;profile.id=`m6-${run}-profile`;profile.ownerId=ownerId;profile.createdAt=now;profile.claims.forEach(c=>{c.confirmedAt=now;});job.sourceId=`m6-${run}`;job.key=`ashby:Ashby:${job.sourceId}`;job.url=`https://jobs.ashbyhq.com/Ashby/${job.sourceId}`;job.checkedAt=now;job.publishedAt=now;match.id=`m6-${run}-match`;match.ownerId=ownerId;match.analyzedAt=now;Object.assign(match,await makeBindings(profile,job,match.config,p.context.preferences));p.contextHash=await preparationContextHash(p.context);await validatePreparationRecord(p,ownerId);
 const pkg=await makeApplicationPackage(`m6-${run}-app`,p,[],job.url,null,now,null);
 const command=applicationCommand(pkg.applicationId,null,{type:'CREATE',package:pkg,reapplication:{confirmed:false,reason:''}},now);
 const first={schemaVersion:1,ownerId,parentId:null,id:`m6-${run}-jobs`,createdAt:now,jobs:[job],review:null,preferences:null};
 const second={...first,id:`m6-${run}-review`,parentId:first.id,jobs:[],review:{key:job.key,state:'SHORTLISTED'}};
 const app={...command,schemaVersion:1,ownerId,parentId:null};
 const entries:ReleaseEntry[]=[['profile',profile],['jobs',first],['jobs',second],['match',match],['prep',p],['applications',app]].map(([kind,record])=>({kind:kind as string,key:`jp:v1:${kind}:${ownerId}:${(record as {id:string}).id}`,value:JSON.stringify(record)}));
 return {ownerId,run,preparation:p,entries};
}
export type ReleaseFixture=Awaited<ReturnType<typeof buildReleaseFixture>>;
export function canCleanFixture(f:ReleaseFixture,ownerId:string,key:string,raw:unknown){return f.ownerId===ownerId&&f.entries.some(e=>e.key===key&&e.value===raw);}
export function classifyForeignRead(value:unknown,error:unknown):'PASS'|'FAIL'|'BLOCKED'{
 if(error){const code=String((error as {code?:string}).code||'');return /^(subject_does_not_exist|not_found|permission_denied|access_denied|forbidden)$/.test(code)?'PASS':'BLOCKED';}
 return value===null?'PASS':value===undefined?'BLOCKED':'FAIL';
}
export function classifyOverlap(v:{dispatchedAt:number|null;settledAt:number|null;identityChangedAt:number|null}){
 return v.dispatchedAt!==null&&v.identityChangedAt!==null&&v.identityChangedAt>=v.dispatchedAt&&(v.settledAt===null||v.identityChangedAt<v.settledAt)?'RPC_OVERLAP_ONLY':'NOT TESTED';
}
