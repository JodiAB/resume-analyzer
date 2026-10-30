import {validateProfile,type ProfileRevision,type Claim} from '../profile/schema';
import {isObject,text,type Job} from '../jobs/model';
import {confirmedClaims,isVerifiedPaidFreelance} from '../matching/experience';
import {skillSupport} from '../matching/engine';
import type {Assessment} from '../matching/types';
import {qualificationPatterns,taskPatterns,negatedEvidence} from '../matching/requirements';
export interface Contact {name:string;email:string;phone:string;location:string;website:string;confirmed:boolean}
export interface Part {claimId:string;excerpt:string}
export interface DraftEdit {claimId:string;text:string;confirmed:boolean;reason:string}
export interface Draft {version:1;template:'classic'|'compact';contact:Contact;parts:Part[];summaryIds:string[];coverIds:string[];cover:boolean;edits:DraftEdit[]}
export interface Line {text:string;style:'title'|'heading'|'body';claimIds:string[]}
const exactKeys=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).length===keys.length&&keys.every(k=>k in v);
const paid=isVerifiedPaidFreelance;
const developing=(c:Claim)=>/\b(?:learning|developing|aspiring|beginner|basic|limited exposure|no experience|not proficient)\b/i.test(c.values.label);
export function sectionFor(c:Claim){return c.kind==='employment'?/\bunpaid|volunteer\b/i.test(c.values.label)?'Other Employment (Unpaid / Volunteer)':'Professional Employment':c.kind==='freelance'?paid(c)?'Paid Freelance Work':'Freelance Work (Payment Not Verified)':c.kind==='project'?'Independent Projects':['education','certification'].includes(c.kind)?'Education and Certifications':developing(c)?'Developing Skills (Proficiency Not Verified)':'Technical Skills';}
// Arbitrary shortening can reverse meaning. Only redundant trailing date
// metadata may move into the separately rendered, unchanged date line.
export function supportedExcerpt(c:Claim,s:string){
 if(!s.trim()||s.length>2000)return false;if(s===c.values.label)return true;
 if(!c.values.start||!c.values.end)return false;
 return [' to ',' — ',' – ',' - '].some(separator=>{const suffix=` ${c.values.start}${separator}${c.values.end}`;return c.values.label.endsWith(suffix)&&c.values.label.slice(0,-suffix.length).trim()===s;});
}
export function createDraft(input:ProfileRevision,_job:Job,assessment:Assessment):Draft {
 const profile=validateProfile(input),claims=confirmedClaims(profile);const relevant=new Set(assessment.components.flatMap(c=>c.claimIds));
 const initial=claims.filter(c=>c.kind!=='project'||relevant.has(c.id));const orderedRequirements=[...assessment.requirements.skills].sort((a,b)=>Number(b.importance==='REQUIRED')-Number(a.importance==='REQUIRED'));const rank=(c:Claim)=>{const n=orderedRequirements.findIndex(r=>r.alternatives.some(t=>skillSupport(c,t)===1));return n<0?Infinity:n;};const skills=initial.filter(c=>c.kind==='skill').sort((a,b)=>rank(a)-rank(b));let index=0;const selected=initial.map(c=>c.kind==='skill'?skills[index++]:c);
 return {version:1,template:'classic',contact:{name:'',email:'',phone:'',location:'',website:'',confirmed:false},parts:selected.map(c=>({claimId:c.id,excerpt:c.values.label})),summaryIds:selected.filter(c=>relevant.has(c.id)).slice(0,3).map(c=>c.id),coverIds:selected.filter(c=>relevant.has(c.id)).slice(0,2).map(c=>c.id),cover:false,edits:[]};
}
export function validateDraft(value:unknown,input:ProfileRevision,forExport=false):Draft {
 const profile=validateProfile(input),claims=confirmedClaims(profile);if(!isObject(value)||!exactKeys(value,['version','template','contact','parts','summaryIds','coverIds','cover','edits'])||value.version!==1||!['classic','compact'].includes(value.template as string)||typeof value.cover!=='boolean'||!isObject(value.contact)||!exactKeys(value.contact,['name','email','phone','location','website','confirmed']))throw new Error('Invalid draft schema');
 const contact=value.contact;for(const k of ['name','email','phone','location','website'])if(!text(contact[k],250)||/[\r\n]/.test(contact[k] as string))throw new Error('Invalid contact');
 if(typeof contact.confirmed!=='boolean'||contact.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contact.email)))throw new Error('Invalid contact confirmation');
 if(contact.website){let u:URL;try{u=new URL(String(contact.website));}catch{throw new Error('Invalid contact URL');}if(u.protocol!=='https:'||u.username||u.password)throw new Error('Invalid contact URL');}
 if(!Array.isArray(value.parts)||value.parts.length>250||!Array.isArray(value.edits)||value.edits.length>250)throw new Error('Draft limits');
 const ids=new Set<string>();for(const p of value.parts){if(!isObject(p)||!exactKeys(p,['claimId','excerpt'])||typeof p.claimId!=='string'||typeof p.excerpt!=='string'||ids.has(p.claimId))throw new Error('Invalid part');const c=claims.find(c=>c.id===p.claimId);if(!c||!supportedExcerpt(c,p.excerpt))throw new Error('Unsupported draft fact');ids.add(p.claimId);}
 for(const k of ['summaryIds','coverIds']){const list=value[k];if(!Array.isArray(list)||list.length>5||new Set(list).size!==list.length||!list.every(id=>typeof id==='string'&&ids.has(id)))throw new Error('Invalid source selection');}
 const editIds=new Set<string>();let pending=false;
 for(const e of value.edits){if(!isObject(e)||!exactKeys(e,['claimId','text','confirmed','reason'])||typeof e.claimId!=='string'||!ids.has(e.claimId)||editIds.has(e.claimId)||!text(e.text,2000)||!e.text.trim()||typeof e.confirmed!=='boolean'||!text(e.reason,500))throw new Error('Invalid draft edit');editIds.add(e.claimId);const c=claims.find(c=>c.id===e.claimId)!;if(!e.confirmed||!supportedExcerpt(c,e.text))pending=true;}
 if(forExport&&(!contact.confirmed||!String(contact.name).trim()||!value.parts.length||pending))throw new Error('Review required: contact or unsupported/unconfirmed edits block export. Confirm source evidence in the profile before adding facts.');
 return structuredClone(value) as unknown as Draft;
}
export function effectiveParts(d:Draft,profile:ProfileRevision):Part[]{return d.parts.map(p=>{const edit=d.edits.find(e=>e.claimId===p.claimId),claim=profile.claims.find(c=>c.id===p.claimId)!;return edit?.confirmed&&supportedExcerpt(claim,edit.text)?{claimId:p.claimId,excerpt:edit.text}:p;});}
export function documentLines(raw:Draft,profile:ProfileRevision,job:Job,kind:'cv'|'cover'):Line[]{
 const d=validateDraft(raw,profile);const parts=effectiveParts(d,profile),find=(id:string)=>parts.find(p=>p.claimId===id)!;const line=(text:string,style:Line['style']='body',claimIds:string[]=[]):Line=>({text,style,claimIds});
 const lines=[line(d.contact.name||'Candidate name — confirmation required','title'),...([d.contact.email,d.contact.phone,d.contact.location,d.contact.website].filter(Boolean).map(s=>line(s)))];
 if(kind==='cover'){
  if(!d.cover)throw new Error('Cover letter not enabled');lines.push(line(`Application: ${job.title}`,'heading'),line(`Dear ${job.employer} hiring team,`),line(`I would like to be considered for the ${job.title} position at ${job.employer}.`));
  for(const id of d.coverIds){const p=find(id),c=profile.claims.find(c=>c.id===id)!;lines.push(line(`A relevant example from my ${sectionFor(c).toLowerCase()} is: ${p.excerpt}`,'body',[id]));}
  lines.push(line('I am interested in discussing how this documented experience relates to the role and learning more about your team’s priorities.'),line('Thank you for considering my application.'),line(d.contact.name||'Candidate'));return lines;
 }
 lines.push(line('Professional Summary','heading'));for(const id of d.summaryIds){const p=find(id),c=profile.claims.find(c=>c.id===id)!;lines.push(line(`${sectionFor(c)}: ${p.excerpt}`,'body',[id]));}
 const headings=['Technical Skills','Professional Employment','Other Employment (Unpaid / Volunteer)','Paid Freelance Work','Freelance Work (Payment Not Verified)','Independent Projects','Education and Certifications','Developing Skills (Proficiency Not Verified)'];
 for(const heading of headings){const selected=parts.filter(p=>sectionFor(profile.claims.find(c=>c.id===p.claimId)!)===heading);if(!selected.length)continue;lines.push(line(heading,'heading'));for(const p of selected){const c=profile.claims.find(c=>c.id===p.claimId)!;lines.push(line(p.excerpt,'body',[p.claimId]));if(c.values.organization&&!p.excerpt.includes(c.values.organization))lines.push(line(c.values.organization,'body',[c.id]));if(c.values.start||c.values.end)lines.push(line(`${c.values.start||'Start not documented'} — ${c.values.end||'End not documented'}`,'body',[c.id]));if(c.values.proficiency)lines.push(line(`Documented proficiency: ${c.values.proficiency}`,'body',[c.id]));if(c.values.url)lines.push(line(c.values.url,'body',[c.id]));}}
 return lines;
}
export function compareDraft(d:Draft,profile:ProfileRevision){const parts=effectiveParts(validateDraft(d,profile),profile);const changes:{claimId:string;kind:string;source:string;draft:string}[]=[];
 for(const c of confirmedClaims(profile)){const p=parts.find(p=>p.claimId===c.id);if(!p)changes.push({claimId:c.id,kind:'OMITTED',source:c.values.label,draft:''});else if(p.excerpt!==c.values.label)changes.push({claimId:c.id,kind:'SHORTENED_OR_REWORDED',source:c.values.label,draft:p.excerpt});else changes.push({claimId:c.id,kind:c.kind==='skill'?'VERIFIED_SKILL_INCLUDED':'PRESERVED',source:c.values.label,draft:p.excerpt});}
 const original=confirmedClaims(profile).map(c=>c.id);for(const [i,p] of parts.entries())if(original.indexOf(p.claimId)!==i)changes.push({claimId:p.claimId,kind:'REORDERED',source:profile.claims.find(c=>c.id===p.claimId)!.values.label,draft:p.excerpt});
 for(const e of d.edits)if(!e.confirmed||!supportedExcerpt(profile.claims.find(c=>c.id===e.claimId)!,e.text))changes.push({claimId:e.claimId,kind:'REQUIRES_CONFIRMATION',source:profile.claims.find(c=>c.id===e.claimId)!.values.label,draft:e.text});return changes;
}
export function keywordCoverage(d:Draft,profile:ProfileRevision,assessment:Assessment){const selected=effectiveParts(validateDraft(d,profile),profile);return [...assessment.requirements.skills,...assessment.requirements.qualifications,...assessment.requirements.tasks,...assessment.requirements.unresolved].map(r=>{
 const facts=confirmedClaims(profile).filter(c=>!developing(c));const supports=(c:Claim)=>!negatedEvidence(c,r.label)&&(r.kind==='skill'?['skill','employment','freelance','project'].includes(c.kind)&&r.alternatives.some(t=>skillSupport(c,t)===1):r.kind==='qualification'?['education','certification'].includes(c.kind)&&!!qualificationPatterns[r.label]?.test(c.values.label):['employment','freelance','project'].includes(c.kind)&&!!taskPatterns[r.label]?.test(c.values.label));const verified=facts.filter(supports);
 const included=selected.some(p=>{const c=profile.claims.find(c=>c.id===p.claimId)!;return verified.some(v=>v.id===c.id)&&supports({...c,values:{...c.values,label:p.excerpt}});});
 const gap=assessment.gaps.find(g=>g.requirementId===r.id);const status=verified.length?included?'VERIFIED_INCLUDED':'VERIFIED_OMITTED':gap?.status==='GAP'?'UNSUPPORTED':r.kind==='skill'&&facts.some(c=>r.alternatives.some(t=>skillSupport(c,t)===.5))?'TRANSFERABLE':'MISSING_EVIDENCE';
 return {requirementId:r.id,label:r.label,importance:r.importance,status,claimIds:verified.map(c=>c.id),quote:r.quote};});}
