import {captureSession,usePuterStore} from '../../lib/puter';
import {currentProfileRepository} from '../profile/repository';
import {currentJobsRepository} from '../jobs/repository';
import type {ProfileRevision} from '../profile/schema';
import type {Job} from '../jobs/model';
import type {SearchPreferences} from '../jobs/preferences';
import {assessMatch,validateMatchConfig} from './engine';
import {makeBindings,sameBindings,type MatchRecord,type Bindings} from './bindings';
import {buildSemanticRequest,validateSemanticResponse,validateSemanticPayload,applySemanticReview} from './semantic';
import {currentMatchRepository} from './repository';
import type {MatchConfig,Assessment} from './types';
export interface MatchContext {profile:ProfileRevision;job:Job;preferences?:SearchPreferences}
export interface PreparedMatch {record:MatchRecord;assessment:Assessment;profile:ProfileRevision;job:Job;assertSession:()=>void}
export async function resolveMatchContext(record:MatchRecord,c:MatchContext,now:string):Promise<Assessment|null>{
  if(record.ownerId!==c.profile.ownerId)throw new Error('Match ownership mismatch');
  const age=Date.parse(now)-Date.parse(record.analyzedAt);if(age<0||age>86400000||record.analyzedAt.slice(0,10)!==now.slice(0,10))return null;
  if(!sameBindings(record,await makeBindings(c.profile,c.job,record.config,c.preferences)))return null;
  const base=assessMatch(c.profile,c.job,record.config,now,c.preferences);return record.semantic?applySemanticReview(base,validateSemanticPayload(record.semantic,c.profile,c.job)):base;
}
interface Dependencies {ownerId:string;assertSession:()=>void;loadContext:()=>Promise<MatchContext>;chat:(messages:ChatMessage[],options:PuterChatOptions)=>Promise<unknown>;repository:ReturnType<typeof currentMatchRepository>;now:()=>string}
export function createMatchService(d:Dependencies){
  const context=async()=>{d.assertSession();const c=await d.loadContext();d.assertSession();if(c.profile.ownerId!==d.ownerId)throw new Error('Profile ownership mismatch');return c;};
  const resolve=async(record:MatchRecord):Promise<Assessment|null>=>{
    d.assertSession();if(record.ownerId!==d.ownerId)throw new Error('Match ownership mismatch');const age=Date.parse(d.now())-Date.parse(record.analyzedAt);if(age<0||age>86400000||record.analyzedAt.slice(0,10)!==d.now().slice(0,10))return null;
    const c=await context(),bindings=await makeBindings(c.profile,c.job,record.config,c.preferences);d.assertSession();if(!sameBindings(record,bindings))return null;
    const base=assessMatch(c.profile,c.job,record.config,d.now(),c.preferences);return record.semantic?applySemanticReview(base,validateSemanticPayload(record.semantic,c.profile,c.job)):base;
  };
  const analyze=async(input:MatchConfig,withAI:boolean,consent:boolean,preview?:Bindings):Promise<PreparedMatch>=>{
    d.assertSession();if(withAI&&!consent)throw new Error('Explicit private excerpt and potential cost consent required');const config=validateMatchConfig(input);const original=await context();const bindings=await makeBindings(original.profile,original.job,config,original.preferences);d.assertSession();
    if(preview&&!sameBindings(preview,bindings))throw new Error('Preview changed; inspect current excerpts and consent again');
    const initial=assessMatch(original.profile,original.job,config,d.now(),original.preferences);let semantic:MatchRecord['semantic']=null;
    if(withAI&&initial.eligibility!=='INELIGIBLE'){const request=buildSemanticRequest(original.profile,original.job);const response=await d.chat(request.messages,request.options);d.assertSession();semantic=validateSemanticResponse(response,original.profile,original.job);}
    const fresh=await context();const current=await makeBindings(fresh.profile,fresh.job,config,fresh.preferences);d.assertSession();if(!sameBindings(bindings,current))throw new Error('Profile, job or preferences changed during analysis; result rejected');
    const analyzedAt=d.now();let assessment=assessMatch(fresh.profile,fresh.job,config,analyzedAt,fresh.preferences);if(semantic)assessment=applySemanticReview(assessment,semantic);else if(withAI&&initial.eligibility==='INELIGIBLE')assessment.warnings.push('AI skipped because deterministic eligibility already disqualifies this role.');
    const record:MatchRecord={schemaVersion:1,id:crypto.randomUUID(),ownerId:d.ownerId,...current,config,analyzedAt,semantic,mode:semantic?'puter-ai':'deterministic',model:semantic?'grok-3':null};
    return {record,assessment,profile:fresh.profile,job:fresh.job,assertSession:d.assertSession};
  };
  const save=async(prepared:PreparedMatch)=>{prepared.assertSession();d.assertSession();if(prepared.record.ownerId!==d.ownerId)throw new Error('Match ownership changed');const assertCurrent=async()=>{prepared.assertSession();if(!await resolve(prepared.record))throw new Error('Profile/job/config context changed or expired');prepared.assertSession();};return d.repository.save(prepared.record,assertCurrent);};
  return {analyze,save,resolve};
}
export async function loadCurrentMatchContext(jobKey:string):Promise<MatchContext>{
  const assertSession=captureSession();const [profile,jobs]=await Promise.all([currentProfileRepository().load(),currentJobsRepository().load()]);assertSession();
  if(profile.conflict||!profile.latest)throw new Error('A single verified profile revision is required');const record=jobs.jobs.find(t=>t.aliases.includes(jobKey));if(!record)throw new Error('Saved job unavailable');return {profile:profile.latest,job:record.job,preferences:jobs.preferences};
}
export function currentMatchService(jobKey:string){const assertSession=captureSession();const s=usePuterStore.getState();return createMatchService({ownerId:s.auth.user!.uuid,assertSession,loadContext:()=>loadCurrentMatchContext(jobKey),chat:s.ai.chat,repository:currentMatchRepository(),now:()=>new Date().toISOString()});}
