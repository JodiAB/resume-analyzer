import {captureSession,usePuterStore} from '../../lib/puter';
import {currentProfileRepository} from '../profile/repository';
import {currentJobsRepository} from '../jobs/repository';
import {currentMatchRepository} from '../matching/repository';
import {resolveMatchContext} from '../matching/service';
import {fingerprint} from '../matching/bindings';
import {currentPreparationRepository} from './repository';
import {preparationContextHash,validatePreparationContext,validatePreparationRecord,type PreparationContext,type PreparationRecord} from './records';
import {validateDraft,type Draft} from './model';
import {buildTailoringRequest,validateTailoringResponse} from './semantic';
export {preparationContextHash} from './records';
interface Dependencies {ownerId:string;assertSession:()=>void;loadContext:()=>Promise<PreparationContext>;repository:ReturnType<typeof currentPreparationRepository>;chat:(messages:ChatMessage[],options:PuterChatOptions)=>Promise<unknown>;now:()=>string}
export interface PreparedRevision {record:PreparationRecord;assertSession:()=>void}
export function createPreparationService(d:Dependencies){
 const context=async()=>{d.assertSession();const c=await validatePreparationContext(await d.loadContext(),d.ownerId);d.assertSession();if(!await resolveMatchContext(c.match,c,d.now()))throw new Error('Assessment stale; reanalyze the job');d.assertSession();return c;};
 const assertRecordCurrent=async(record:PreparationRecord)=>{d.assertSession();await validatePreparationRecord(record,d.ownerId);d.assertSession();const c=await context();if(record.contextHash!==await preparationContextHash(c))throw new Error('Profile, job, assessment or review changed; regenerate');d.assertSession();};
 const prepare=async(input:Draft,withAI:boolean,consent:boolean,previewHash:string,parentId:string|null,edited=false):Promise<PreparedRevision>=>{
  d.assertSession();if(withAI&&!consent)throw new Error('Explicit excerpt/cost consent required');const c=await context(),hash=await preparationContextHash(c);d.assertSession();if(previewHash!==hash)throw new Error('Consent preview changed; reload/review before generation');let draft=validateDraft(input,c.profile);const assessment=await resolveMatchContext(c.match,c,d.now());d.assertSession();if(!assessment)throw new Error('Assessment stale');
  if(withAI){const req=buildTailoringRequest(c.profile,c.job,assessment,draft);const response=await d.chat(req.messages,req.options);d.assertSession();draft=validateTailoringResponse(response,c.profile,c.job,assessment,draft);}
  const fresh=await context();if(hash!==await preparationContextHash(fresh))throw new Error('Generation source changed; previous drafts preserved');d.assertSession();const record:PreparationRecord={schemaVersion:1,id:crypto.randomUUID(),ownerId:d.ownerId,parentId,createdAt:d.now(),contextHash:hash,contentHash:await fingerprint(draft),mode:withAI?'puter-ai':edited?'candidate-edit':'deterministic',status:'DRAFT_REVIEW_REQUIRED',context:c,draft};await validatePreparationRecord(record,d.ownerId);d.assertSession();return {record,assertSession:d.assertSession};
 };
 const save=async(p:PreparedRevision)=>{p.assertSession();d.assertSession();return d.repository.save(p.record,async()=>{p.assertSession();await assertRecordCurrent(p.record);p.assertSession();});};
 const isCurrent=async(record:PreparationRecord)=>{try{await assertRecordCurrent(record);return true;}catch{d.assertSession();return false;}};
 return {prepare,save,isCurrent,assertRecordCurrent};
}
export async function loadPreparationContext(key:string):Promise<PreparationContext>{
 const a=captureSession();const [p,j,m]=await Promise.all([currentProfileRepository().load(),currentJobsRepository().load(),currentMatchRepository().list()]);a();if(p.conflict||!p.latest)throw new Error('A single verified profile is required');const t=j.jobs.find(t=>t.aliases.includes(key));if(!t||t.review!=='SHORTLISTED')throw new Error('Shortlist this assessed job first');const c={profile:p.latest,job:t.job,preferences:j.preferences};
 for(const match of m.filter(m=>m.jobKey===t.job.key).sort((a,b)=>b.analyzedAt.localeCompare(a.analyzedAt))){if(await resolveMatchContext(match,c,new Date().toISOString())){a();return {...c,match,review:'SHORTLISTED'};}}throw new Error('Current assessment required; reanalyze this job');
}
export function currentPreparationService(key:string){const a=captureSession(),s=usePuterStore.getState();return createPreparationService({ownerId:s.auth.user!.uuid,assertSession:a,loadContext:()=>loadPreparationContext(key),repository:currentPreparationRepository(),chat:s.ai.chat,now:()=>new Date().toISOString()});}
