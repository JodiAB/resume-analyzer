import {expect,it} from 'vitest';
import {evaluateJob} from '../app/features/jobs/eligibility';
import {defaultSearchPreferences,filterJobs} from '../app/features/jobs/preferences';
import {importManualJob} from '../app/features/jobs/manual';
import {normalizePosting} from '../app/features/jobs/adapters.server';
import {getBoard} from '../app/features/jobs/boards';
import {gh,checked} from './fixtures/jobs';
const prefs=defaultSearchPreferences();
const posting=(description:string,location='Remote')=>normalizePosting(getBoard('greenhouse','greenhouse'),{...gh,content:description,location:{name:location}},checked)!;
it('extracts a specific SA hiring location without treating freshness as location proof',()=>{
 const j=posting('Frontend engineer.','Remote - South Africa');
 expect(evaluateJob({...j,publishedAt:null},prefs,checked).saEligibility).toBe('ELIGIBLE');
 expect(evaluateJob({...j,publishedAt:null},prefs,checked).status).toBe('UNVERIFIED');
});
it('retains regional labels as unknown but exposes their review evidence',()=>{
 const e=evaluateJob(posting('Frontend engineer.','Remote - US'),prefs,checked);
 expect(e.saEligibility).toBe('UNKNOWN');expect(e.reasons.join(' ')).toContain('Advertised location');expect(e.evidence).toContain('Remote - US');
});
it('recognizes explicit country choices while keeping personal authorization unresolved',()=>{
 const e=evaluateJob(posting('All candidates must be legally authorized to work in one of the following countries: United States, Canada, South Africa, United Kingdom.'),prefs,checked);
 expect(e.saEligibility).toBe('ELIGIBLE');expect(e.status).toBe('UNVERIFIED');
});
it('captures legally eligible wording without inferring a lack of authorization',()=>{
 const e=evaluateJob(posting('Applicants must be legally eligible to work in the United Kingdom.'),prefs,checked);
 expect(e.saEligibility).toBe('UNKNOWN');expect(e.status).toBe('UNVERIFIED');expect(e.reasons.join(' ')).toContain('authorization');
});
it('keeps customer-country mentions and excluded SA locations unknown or ineligible',()=>{
 expect(evaluateJob(posting('Our customers in South Africa use React.'),prefs,checked).saEligibility).toBe('UNKNOWN');
 expect(evaluateJob(posting('We do not hire in South Africa.','Remote - South Africa'),prefs,checked).saEligibility).toBe('INELIGIBLE');
});
it('retains manually imported unknown eligibility for review',async()=>{
 const j=await importManualJob({url:'https://example.org/jobs/one',employer:'Synthetic',title:'Frontend Developer',description:'Remote; hiring geography unconfirmed.'},checked);
 expect(evaluateJob(j,prefs,checked).saEligibility).toBe('UNKNOWN');expect(filterJobs([j],prefs,checked)).toHaveLength(1);
});
it('only adds the verified KoBold public board, without assuming employer-wide eligibility',()=>{
 expect(getBoard('greenhouse','koboldmetals').employer).toBe('KoBold Metals');
 expect(()=>getBoard('greenhouse','unreviewed')).toThrow();
});
it('accepts the verified Workwize EU board only at its exact official destination',async()=>{
 const {officialDestination}=await import('../app/features/applications/destination');
 const board=getBoard('greenhouse','workwize');
 const j=normalizePosting(board,{...gh,absolute_url:'https://job-boards.eu.greenhouse.io/workwize/jobs/'+gh.id},checked)!;
 expect(officialDestination(j)).toBe(j.url);
 expect(()=>officialDestination(j,j.url!.replace('workwize/jobs','other/jobs'))).toThrow();
});
it('extracts an explicit remote hiring choice of Europe or SA without promoting customer geography',()=>{
 const e=evaluateJob(posting('Working location: Based in Europe or South Africa, and hired remotely unless based in the Netherlands.'),prefs,checked);
 expect(e.saEligibility).toBe('ELIGIBLE');
});
it('does not mistake a country-specific pension benefit for a hiring-country restriction',()=>{
 const e=evaluateJob(posting('Based in Europe or South Africa, and hired remotely unless based in the Netherlands.\nPension scheme. (Netherlands only).'),prefs,checked);
 expect(e.saEligibility).toBe('ELIGIBLE');expect(e.status).not.toBe('INELIGIBLE');
});
it('does not reject a permitted-country choice merely because one alternative authorization is unavailable',()=>{
 const e=evaluateJob(posting('All candidates must be legally authorized to work in one of the following countries: United States, South Africa.'),{...prefs,lacksAuthorization:['United States']},checked);
 expect(e.saEligibility).toBe('ELIGIBLE');expect(e.status).toBe('UNVERIFIED');
});
it('includes the employer-owned Supabase Ashby board without assuming SA permission',()=>{
 expect(getBoard('ashby','supabase').employer).toBe('Supabase');
 expect(evaluateJob({...posting('We hire worldwide.'),board:'supabase',source:'ashby',locations:['Remote, Global']},prefs,checked).saEligibility).toBe('UNKNOWN');
});
it('includes the current Sourcegraph employer-owned Greenhouse board',()=>{
 expect(getBoard('greenhouse','sourcegraph91').employer).toBe('Sourcegraph');
});
