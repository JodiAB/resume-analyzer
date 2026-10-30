import {expect,it} from 'vitest';
import {profileFixture,jobFixture,asOf} from './fixtures/matching';
import {assessMatch,defaultMatchConfig} from '../app/features/matching/engine';
import {createDraft,validateDraft,documentLines,keywordCoverage,compareDraft,supportedExcerpt,sectionFor} from '../app/features/preparation/model';
const fixture=()=>{const profile=profileFixture(),job=jobFixture();return {profile,job,assessment:assessMatch(profile,job,defaultMatchConfig(),asOf)};};
it('preserves all original work dates and separate employment, freelance, project and credential headings',()=>{
 const c=fixture(),d=createDraft(c.profile,c.job,c.assessment),lines=documentLines(d,c.profile,c.job,'cv');const text=lines.map(l=>l.text).join('\n');
 expect(text).toContain('Professional Employment');expect(text).toContain('Paid Freelance Work');expect(text).toContain('Independent Projects');expect(text).toContain('Education and Certifications');
 for(const claim of c.profile.claims.filter(c=>c.values.start))expect(text).toContain(`${claim.values.start} — ${claim.values.end}`);
 expect(c.profile.id).toBe('profile-1');
});
it('does not infer contact details or allow unconfirmed contact in downloadable content',()=>{
 const c=fixture(),d=createDraft(c.profile,c.job,c.assessment);expect(d.contact.name).toBe('');expect(()=>validateDraft({...d,contact:{...d.contact,name:'Synthetic Candidate',confirmed:false}},c.profile,true)).toThrow();
});
it('rejects invented AI/source selection and removes unverified profile facts from draft generation',()=>{
 const c=fixture();c.profile.claims[3].basis=null;c.profile.claims[3].confirmedAt=null;const d=createDraft(c.profile,c.job,c.assessment);expect(d.parts.some(p=>p.claimId==='claim-3')).toBe(false);
 expect(()=>validateDraft({...d,parts:[...d.parts,{claimId:'fake',excerpt:'Expert Rust'}]},c.profile)).toThrow();
});
it('stores unsupported edits visibly but blocks export until the profile supplies verified evidence',()=>{
 const c=fixture(),d=createDraft(c.profile,c.job,c.assessment);d.edits=[{claimId:'claim-0',text:'Led 50 Kubernetes engineers',confirmed:true,reason:'Candidate entered correction'}];
 expect(validateDraft(d,c.profile).edits).toHaveLength(1);expect(()=>validateDraft(d,c.profile,true)).toThrow();expect(compareDraft(d,c.profile).some(x=>x.kind==='REQUIRES_CONFIRMATION')).toBe(true);
});
it('supports evidence-backed shortening while rejecting removal of source qualifiers',()=>{
 const c=fixture(),d=createDraft(c.profile,c.job,c.assessment);d.parts[0].excerpt='Senior React developer';expect(validateDraft(d,c.profile)).toBeTruthy();d.parts[0].excerpt='Senior React leader';expect(()=>validateDraft(d,c.profile)).toThrow();
});
it('classifies verified included, verified omitted, transferable, declared unsupported and missing evidence',()=>{
 const c=fixture(),d=createDraft(c.profile,c.job,c.assessment);let coverage=keywordCoverage(d,c.profile,c.assessment);expect(coverage.some(k=>k.label==='React'&&k.status==='VERIFIED_INCLUDED')).toBe(true);
 d.parts=d.parts.filter(p=>!['claim-2','claim-4'].includes(p.claimId));d.summaryIds=d.summaryIds.filter(id=>d.parts.some(p=>p.claimId===id));d.coverIds=d.coverIds.filter(id=>d.parts.some(p=>p.claimId===id));coverage=keywordCoverage(d,c.profile,c.assessment);expect(coverage.some(k=>k.label==='TypeScript'&&k.status==='VERIFIED_OMITTED')).toBe(true);
});
it('creates a modest employer-specific cover letter with only cited candidate evidence',()=>{
 const c=fixture(),d=createDraft(c.profile,c.job,c.assessment);d.cover=true;const text=documentLines(d,c.profile,c.job,'cover').map(l=>l.text).join('\n');expect(text).toContain(c.job.employer);expect(text).toContain(c.job.title);expect(text).not.toMatch(/perfect|guarantee|outstanding|world.class/i);
});


it.each([['Never led teams','led teams'],['No production experience; no leadership experience','no leadership experience']])('rejects shortening that can reverse source meaning: %s',(source,shortened)=>{
 const c=profileFixture().claims[0];c.values.label=source;expect(supportedExcerpt(c,shortened)).toBe(false);
});
it.each(['Freelance React work; never paid','Freelance React work; not yet paid','Freelance React work without paid work'])('does not label ambiguous/negated freelance payment as paid: %s',label=>{
 const c=profileFixture().claims[1];c.values.label=label;expect(sectionFor(c)).toBe('Freelance Work (Payment Not Verified)');
});
it('classifies required/preferred credential keywords as well as technical skills',()=>{
 const c=fixture(),d=createDraft(c.profile,c.job,c.assessment);expect(keywordCoverage(d,c.profile,c.assessment).some(k=>k.label==='AWS Certified Developer'&&k.status==='VERIFIED_INCLUDED')).toBe(true);
});
it('keeps developing skills separate from verified technical skill headings',()=>{
 const c=profileFixture().claims.find(c=>c.kind==='skill')!;c.values.label='Learning React';expect(sectionFor(c)).toBe('Developing Skills (Proficiency Not Verified)');
});
it('does not call an explicitly negated technology a verified included ATS keyword',()=>{
 const c=fixture();const claim=c.profile.claims.find(c=>c.kind==='skill')!;claim.values.label='Never used React';claim.evidence={page:1,start:0,end:claim.values.label.length,quote:claim.values.label};c.profile.source.pages=[{page:1,text:claim.values.label}];c.profile.claims=[claim];const d=createDraft(c.profile,c.job,c.assessment);expect(keywordCoverage(d,c.profile,c.assessment).find(k=>k.label==='React')?.status).toBe('MISSING_EVIDENCE');
});
it('orders confirmed technical skills by the selected job requirements without adding technologies',()=>{
 const c=fixture(),base=c.profile.claims.find(c=>c.kind==='skill')!;const node={...structuredClone(base),id:'node',values:{...base.values,label:'Node.js'},evidence:{page:2,start:0,end:7,quote:'Node.js'}};c.profile.claims.push(node);c.profile.source.pages.push({page:2,text:'Node.js'});c.job.description='Required skills: Node.js and React.';const a=assessMatch(c.profile,c.job,defaultMatchConfig(),asOf),d=createDraft(c.profile,c.job,a);expect(d.parts.filter(p=>c.profile.claims.find(c=>c.id===p.claimId)?.kind==='skill').map(p=>p.claimId)).toEqual(['node','claim-3','claim-4']);
});
