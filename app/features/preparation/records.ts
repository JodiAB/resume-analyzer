import {validateProfile,validId} from '../profile/schema';
import {isObject,timestamp,validateJob} from '../jobs/model';
import {validateSearchPreferences,type SearchPreferences} from '../jobs/preferences';
import {fingerprint,makeBindings,sameBindings,type MatchRecord} from '../matching/bindings';
import {resolveMatchContext} from '../matching/service';
import type {MatchContext} from '../matching/service';
import {validateSemanticPayload} from '../matching/semantic';
import {validateDraft,type Draft} from './model';
export interface PreparationContext extends MatchContext {preferences:SearchPreferences;match:MatchRecord;review:'SHORTLISTED'}
export interface PreparationRecord {schemaVersion:1;id:string;ownerId:string;parentId:string|null;createdAt:string;contextHash:string;contentHash:string;mode:'deterministic'|'puter-ai'|'candidate-edit';status:'DRAFT_REVIEW_REQUIRED';context:PreparationContext;draft:Draft}
export const preparationContextHash=(c:PreparationContext)=>fingerprint(c);
const keys=(v:Record<string,unknown>,k:string[])=>Object.keys(v).length===k.length&&k.every(k=>k in v);
export async function validatePreparationContext(raw:unknown,ownerId:string):Promise<PreparationContext>{
 if(!isObject(raw)||!keys(raw,['profile','job','preferences','match','review'])||raw.review!=='SHORTLISTED')throw new Error('A shortlisted assessed job is required');
 const profile=validateProfile(raw.profile),job=validateJob(raw.job),preferences=validateSearchPreferences(raw.preferences);if(profile.ownerId!==ownerId||!isObject(raw.match))throw new Error('Preparation source owner mismatch');
 const m=raw.match;if(!keys(m,['schemaVersion','id','ownerId','profileId','profileHash','jobKey','jobHash','configHash','preferencesHash','config','analyzedAt','semantic','mode','model'])||m.schemaVersion!==1||!validId(m.id)||m.ownerId!==ownerId||!timestamp(m.analyzedAt)||!['deterministic','puter-ai'].includes(m.mode as string))throw new Error('Invalid source assessment');
 const match=m as unknown as MatchRecord;if(match.mode==='deterministic'&&(match.semantic!==null||match.model!==null)||match.mode==='puter-ai'&&(match.model!=='grok-3'||match.semantic===null))throw new Error('Invalid assessment provenance');
 if(!sameBindings(match,await makeBindings(profile,job,match.config,preferences)))throw new Error('Assessment source binding mismatch');if(match.semantic)validateSemanticPayload(match.semantic,profile,job);
 return {profile,job,preferences,match:structuredClone(match),review:'SHORTLISTED'};
}
export async function validatePreparationRecord(raw:unknown,ownerId:string):Promise<PreparationRecord>{
 if(!isObject(raw)||!keys(raw,['schemaVersion','id','ownerId','parentId','createdAt','contextHash','contentHash','mode','status','context','draft'])||raw.schemaVersion!==1||!validId(raw.id)||raw.ownerId!==ownerId||raw.parentId!==null&&(!validId(raw.parentId)||raw.parentId===raw.id)||!timestamp(raw.createdAt)||raw.status!=='DRAFT_REVIEW_REQUIRED'||!['deterministic','puter-ai','candidate-edit'].includes(raw.mode as string))throw new Error('Invalid preparation ownership/revision');
 const context=await validatePreparationContext(raw.context,ownerId),draft=validateDraft(raw.draft,context.profile);
 if(raw.contextHash!==await preparationContextHash(context)||raw.contentHash!==await fingerprint(draft)||Date.parse(raw.createdAt)<Date.parse(context.match.analyzedAt)||!await resolveMatchContext(context.match,context,context.match.analyzedAt))throw new Error('Preparation integrity failure');
 return {...raw,context,draft} as unknown as PreparationRecord;
}
