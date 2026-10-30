import {profileFixture,jobFixture,asOf} from './matching';
import {makeSource} from '../../app/features/profile/extract';
import {defaultSearchPreferences} from '../../app/features/jobs/preferences';
import {defaultMatchConfig,assessMatch} from '../../app/features/matching/engine';
import {makeBindings,fingerprint} from '../../app/features/matching/bindings';
import {createDraft} from '../../app/features/preparation/model';
import {preparationContextHash,type PreparationRecord} from '../../app/features/preparation/records';
export async function applicationPreparation():Promise<PreparationRecord>{
 const profile=profileFixture();profile.source=await makeSource('synthetic.pdf',new Uint8Array([1]),profile.source.pages.map(p=>p.text));const job=jobFixture(),preferences=defaultSearchPreferences(),config=defaultMatchConfig();const match={schemaVersion:1 as const,id:'match-1',ownerId:'a',...await makeBindings(profile,job,config,preferences),config,analyzedAt:asOf,semantic:null,mode:'deterministic' as const,model:null};const context={profile,job,preferences,match,review:'SHORTLISTED' as const};const draft=createDraft(profile,job,assessMatch(profile,job,config,asOf));draft.contact={name:'Synthetic Candidate',email:'synthetic@example.com',phone:'',location:'',website:'',confirmed:true};
 return {schemaVersion:1,id:'prep-1',ownerId:'a',parentId:null,createdAt:asOf,contextHash:await preparationContextHash(context),contentHash:await fingerprint(draft),mode:'deterministic',status:'DRAFT_REVIEW_REQUIRED',context,draft};
}
export const fileHashes={cv:{pdfHash:'a'.repeat(64),docxHash:'b'.repeat(64)},cover:null};
