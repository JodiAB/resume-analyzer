import {it,expect} from 'vitest';
import {jobFixture} from './fixtures/matching';
import {officialDestination,vacancyIdentity} from '../app/features/applications/destination';
it('accepts only the exact reviewed employer ATS vacancy and normalizes benign variants',()=>{
 const j=jobFixture();expect(officialDestination(j,j.url!+'?utm_source=test')).toBe(j.url);expect(vacancyIdentity(j)).toBe(vacancyIdentity({...j,url:j.url+'/application'}));
});
it.each(['https://jobs.ashbyhq.com.evil.example/Ashby/match-job','https://jobs.ashbyhq.com/Ashby/another-job','https://jobs.ashbyhq.com/Ashby/match-job?redirect=https://evil.example','http://jobs.ashbyhq.com/Ashby/match-job','https://user:password@jobs.ashbyhq.com/Ashby/match-job','https://127.0.0.1/private','javascript:alert(1)','https://jobs.ashbyhq.com/Ashby/%2e%2e/match-job'])('rejects malicious, changed or ambiguous destinations: %s',url=>expect(()=>officialDestination(jobFixture(),url)).toThrow());
it('does not promote manual or arbitrary custom URLs into verified official submission destinations',()=>{
 const j=jobFixture();expect(()=>officialDestination({...j,source:'manual',url:'https://careers.example.com/role'})).toThrow();
});
it('accepts a live Greenhouse redundant matching gh_jid without allowing conflicting or repeated destination parameters',()=>{
 const j={...jobFixture(),source:'greenhouse' as const,board:'greenhouse',sourceId:'8126988',key:'greenhouse:greenhouse:8126988',url:'https://job-boards.greenhouse.io/greenhouse/jobs/8126988?gh_jid=8126988'};
 expect(officialDestination(j)).toBe('https://job-boards.greenhouse.io/greenhouse/jobs/8126988');
 expect(()=>officialDestination({...j,url:j.url.replace('gh_jid=8126988','gh_jid=999')})).toThrow();
 expect(()=>officialDestination({...j,url:j.url+'&gh_jid=8126988'})).toThrow();
});
