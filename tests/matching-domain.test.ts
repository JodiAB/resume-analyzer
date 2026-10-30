import {expect,it} from 'vitest';
import {parseRequirements} from '../app/features/matching/requirements';
import {experienceSummary} from '../app/features/matching/experience';
import {assessMatch,defaultMatchConfig,validateMatchConfig} from '../app/features/matching/engine';
import {profileFixture,jobFixture,asOf} from './fixtures/matching';
it('produces source-bound required/preferred criteria without splitting Next.js or inventing requirements',()=>{
  const j=jobFixture();j.description+='\nPreferred: Next.js.\nReact Native is not required.';
  const r=parseRequirements(j);
  expect(r.skills.some(s=>s.alternatives.includes('Next.js')&&s.importance==='PREFERRED')).toBe(true);
  expect(r.skills.filter(s=>s.importance==='REQUIRED').flatMap(s=>s.alternatives)).toEqual(['React','TypeScript']);
  for(const e of r.all)expect(String(j[e.field]||'').slice(e.start,e.end)).toBe(e.quote);
});
it('scores exact confirmed evidence using the documented six weights, never an interview probability',()=>{
  const r=assessMatch(profileFixture(),jobFixture(),defaultMatchConfig(),asOf);
  expect(r.score).toBe(100);expect(r.components.map(c=>c.maximum)).toEqual([35,25,15,10,10,5]);
  expect(r.eligibility).toBe('ELIGIBLE');expect(r.confidence).toBe('HIGH');expect(r.recommendation).toBe('RECOMMENDED');
});
it('does not double-count overlapping commercial and paid freelance periods',()=>{
  const p=profileFixture();const e=experienceSummary(p,asOf);
  expect(e.commercial.minMonths).toBe(60);expect(e.paidFreelance.minMonths).toBe(24);expect(e.professional.minMonths).toBe(60);expect(e.handsOn.minMonths).toBe(72);
});
it('never turns projects or unspecified freelance pay into commercial employment',()=>{
  const p=profileFixture();p.claims=p.claims.filter(c=>c.kind==='project'||c.kind==='freelance');
  p.claims[0]={...p.claims[0],values:{...p.claims[0].values,label:p.claims[0].values.label.replace('Paid ','')},basis:null,confirmedAt:null};
  const e=experienceSummary(p,asOf);expect(e.commercial.minMonths).toBe(0);expect(e.professional.minMonths).toBe(0);expect(e.handsOn.minMonths).toBe(36);
});
it('keeps incomplete dates as duration bounds instead of invented exact years',()=>{
  const p=profileFixture();p.claims=[p.claims[0]];const c=p.claims[0];c.values.start='2020';c.values.end='2024';
  const e=experienceSummary(p,asOf);expect(e.commercial.minMonths).toBe(36);expect(e.commercial.maxMonths).toBe(60);
});
it('blocks recommendation despite an excellent technical score for explicit ineligibility',()=>{
  const j=jobFixture();j.description+='\nRemote US only.';
  const r=assessMatch(profileFixture(),j,defaultMatchConfig(),asOf);
  expect(r.score).toBe(100);expect(r.eligibility).toBe('INELIGIBLE');expect(r.recommendation).toBe('BLOCKED');
});
it('keeps missing mandatory work authorization UNKNOWN even with a high score',()=>{
  const j=jobFixture();j.description=j.description.replace('No work authorization restrictions apply for this role.','Must be authorized to work in the United States.');
  const r=assessMatch(profileFixture(),j,defaultMatchConfig(),asOf);
  expect(r.eligibility).toBe('UNKNOWN');expect(r.recommendation).toBe('MANUAL_REVIEW');
});
it('distinguishes an actual candidate-declared gap from a qualification not documented in the CV',()=>{
  const p=profileFixture();p.claims=p.claims.filter(c=>c.kind!=='certification');const j=jobFixture();j.description=j.description.replace('Preferred qualification:','Required qualification:');
  const unknown=assessMatch(p,j,defaultMatchConfig(),asOf);expect(unknown.eligibility).toBe('UNKNOWN');
  expect(unknown.gaps.some(g=>g.status==='NOT_DOCUMENTED'&&g.label==='AWS Certified Developer')).toBe(true);
  const gap=assessMatch(p,j,{...defaultMatchConfig(),declaredGaps:['AWS Certified Developer']},asOf);expect(gap.eligibility).toBe('INELIGIBLE');expect(gap.gaps.some(g=>g.status==='GAP')).toBe(true);
});
it('gives only partial transferable credit without claiming the required technology is verified',()=>{
  const p=profileFixture();p.claims=p.claims.filter(c=>c.kind==='skill'&&c.values.label==='TypeScript');
  const j=jobFixture();j.description='We hire remote employees in South Africa.\nRequired skills: JavaScript.';
  const r=assessMatch(p,j,defaultMatchConfig(),asOf);
  expect(r.components[0].points).toBe(17.5);expect(r.gaps.some(g=>g.label==='JavaScript'&&g.status==='TRANSFERABLE')).toBe(true);expect(r.eligibility).toBe('UNKNOWN');
});
it('treats sparse descriptions, unconfirmed claims and title seniority gaps cautiously',()=>{
  const p=profileFixture();p.claims.forEach(c=>{c.basis=null;c.confirmedAt=null;});
  const r=assessMatch(p,{...jobFixture(),description:''},defaultMatchConfig(),asOf);
  expect(r.score).toBe(0);expect(r.confidence).toBe('LOW');expect(r.recommendation).toBe('MANUAL_REVIEW');
});
it('does not infer seniority from years or count attested qualifications as CV verified',()=>{
  const p=profileFixture();p.claims=p.claims.filter(c=>c.kind==='skill');p.claims[0].basis='attestation';p.claims[0].correctionReason='Self-reported correction outside this CV';
  const r=assessMatch(p,jobFixture(),defaultMatchConfig(),asOf);expect(r.components[3].points).toBe(0);expect(r.components[0].points).toBe(17.5);
});
it('requires a valid 100-point rubric and ordered recommendation thresholds',()=>{
  expect(()=>validateMatchConfig({...defaultMatchConfig(),weights:{skills:100,experience:25,projects:15,seniority:10,responsibilities:10,secondary:5}})).toThrow();
  expect(()=>validateMatchConfig({...defaultMatchConfig(),thresholds:{excellent:70,strong:80,potential:90}})).toThrow();
});
it('keeps unsupported mandatory technology conditions unresolved instead of ignoring them',()=>{
  const j=jobFixture();j.description+='\nRequired skills: Rust.';
  const r=assessMatch(profileFixture(),j,defaultMatchConfig(),asOf);
  expect(r.eligibility).toBe('UNKNOWN');expect(r.recommendation).toBe('MANUAL_REVIEW');expect(r.requirements.unresolved.length).toBeGreaterThan(0);
});
it('does not infer years of TypeScript experience from separate React employment',()=>{
  const j=jobFixture();j.description=j.description.replace('professional experience with React.','professional experience with React and TypeScript.');
  expect(assessMatch(profileFixture(),j,defaultMatchConfig(),asOf).eligibility).toBe('UNKNOWN');
});
it('matches explicit authorization jurisdictions with word boundaries and country aliases',()=>{
  const j=jobFixture();j.description=j.description.replace('No work authorization restrictions apply for this role.','Must be authorized to work in Austria.');
  expect(assessMatch(profileFixture(),j,{...defaultMatchConfig(),confirmedAuthorizations:['US']},asOf).eligibility).toBe('UNKNOWN');
  j.description=j.description.replace('Austria','the United States');
  expect(assessMatch(profileFixture(),j,{...defaultMatchConfig(),confirmedAuthorizations:['US']},asOf).eligibility).toBe('ELIGIBLE');
});
it.each(['Mentoring is required.','Must have testing skills.','Must have a valid security clearance and React.','React and Kubernetes are required.'])('does not silently pass unsupported mandatory conditions: %s',condition=>{
 const j=jobFixture();j.description+='\n'+condition;expect(assessMatch(profileFixture(),j,defaultMatchConfig(),asOf).eligibility).toBe('UNKNOWN');
});

it('excludes negated technology from verified professional duration',()=>{
 const p=profileFixture();const c=p.claims[0];c.values.label='Senior Java developer, no React experience 2020-01-01 to 2024-12-31';c.evidence={page:1,start:0,end:c.values.label.length,quote:c.values.label};p.source.pages=[{page:1,text:c.values.label}];p.claims=[c];
 expect(experienceSummary(p,asOf,['React']).professional.minMonths).toBe(0);
});
it('keeps unknown technology within a numeric experience requirement unresolved',()=>{
 const j=jobFixture();j.description+='\nMinimum 2 years of professional experience with React and Kubernetes.';
 expect(assessMatch(profileFixture(),j,defaultMatchConfig(),asOf).eligibility).toBe('UNKNOWN');
});
it('does not use general employment to establish unknown named technology experience',()=>{
 const j=jobFixture();j.description+='\nMinimum 2 years of Kubernetes experience required.';
 j.description=j.description.replace('Minimum 2 years of professional experience with React.','');const a=assessMatch(profileFixture(),j,defaultMatchConfig(),asOf);expect(a.components.find(c=>c.key==='experience')?.points).toBe(0);expect(a.eligibility).toBe('UNKNOWN');expect(a.requirements.unresolved.length).toBeGreaterThan(0);
});
it('retains unsupported conditions alongside a recognized mandatory qualification',()=>{
 const j=jobFixture();j.description+="\nBachelor's degree and a valid security clearance are required.";
 expect(parseRequirements(j).unresolved.length).toBeGreaterThan(0);
});

it.each(['Requirements:\nKubernetes','Required: Kubernetes; React preferred.','React preferred, but Kubernetes is mandatory.'])('keeps inherited or mixed mandatory clauses unresolved: %s',condition=>{
 const j=jobFixture();j.description+='\n'+condition;expect(assessMatch(profileFixture(),j,defaultMatchConfig(),asOf).eligibility).toBe('UNKNOWN');
});
it.each(['never paid','not yet paid','without paid work'])('never counts %s freelance as verified professional duration',suffix=>{
 const p=profileFixture();const c=p.claims.find(c=>c.kind==='freelance')!;c.values.label=`Freelance React work ${suffix} 2021-01-01 to 2022-12-31`;c.evidence={page:1,start:0,end:c.values.label.length,quote:c.values.label};p.claims=[c];p.source.pages=[{page:1,text:c.values.label}];expect(experienceSummary(p,asOf).paidFreelance.minMonths).toBe(0);
});
