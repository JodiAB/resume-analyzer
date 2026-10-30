import { expect, it } from 'vitest';
import { canonicalUrl, validateJob, type Job } from '../app/features/jobs/model';
import { defaultSearchPreferences, filterJobs, preferencesFromProfile } from '../app/features/jobs/preferences';
import { evaluateJob } from '../app/features/jobs/eligibility';
import { mergeJobs } from '../app/features/jobs/dedup';
import { importManualJob, recognizeJobUrl } from '../app/features/jobs/manual';
import { safeNext } from '../app/lib/validation';
export const now = '2026-10-27T12:00:00.000Z';
export const job: Job = { key: 'ashby:Ashby:job-1', source: 'ashby', board: 'Ashby', sourceId: 'job-1', employer: 'Synthetic Employer', employerCountry: null, title: 'Frontend Developer', url: 'https://jobs.ashbyhq.com/Ashby/job-1', description: 'We hire remote employees in South Africa. React and TypeScript required.', locations: ['South Africa'], remote: 'REMOTE', employmentType: 'FullTime', seniority: null, skills: ['React', 'TypeScript'], salary: [], salaryNotes: '', publishedAt: '2026-10-25T10:00:00.000Z', publicationKind: 'LAST_PUBLISHED', updatedAt: null, deadline: null, checkedAt: now, availability: 'OPEN', checkError: null };
it('does not confuse update time with publication or hide missing salaries', () => {
  const unknown = { ...job, publishedAt: null, publicationKind: 'UNKNOWN' as const, updatedAt: now };
  expect(evaluateJob(unknown, defaultSearchPreferences(), now).status).toBe('UNVERIFIED');
  expect(filterJobs([unknown], defaultSearchPreferences(), now)).toHaveLength(1);
});
it('verifies a recent listed explicitly SA-eligible remote job without requiring salary', () => {
  expect(evaluateJob(job, defaultSearchPreferences(), now).status).toBe('VERIFIED');
});
it.each(['Remote position', 'Worldwide opportunity; country restrictions may apply', 'Not hiring worldwide', 'Remote, United States office'])('keeps ambiguous remote text unknown: %s', description => {
  expect(evaluateJob({ ...job, description, locations: ['Remote'] }, defaultSearchPreferences(), now).saEligibility).toBe('UNKNOWN');
});
it.each(['We do not hire in South Africa.', 'Remote US only.', 'Applicants must be based in the United Kingdom.'])('hard-filters explicit incompatibility: %s', description => {
  const j = { ...job, description, locations: ['Remote'] };
  expect(evaluateJob(j, defaultSearchPreferences(), now).status).toBe('INELIGIBLE');
  expect(filterJobs([j], defaultSearchPreferences(), now)).toEqual([]);
});
it('does not claim missing work authorization, and rejects only a declared lack', () => {
  const j = { ...job, description: job.description + ' Must be authorized to work in the United States.' };
  expect(evaluateJob(j, defaultSearchPreferences(), now).status).toBe('UNVERIFIED');
  expect(evaluateJob(j, { ...defaultSearchPreferences(), lacksAuthorization: ['United States'] }, now).status).toBe('INELIGIBLE');
});
it('hard-filters confirmed outside-country onsite work but keeps unknown locations for review', () => {
  expect(evaluateJob({ ...job, remote: 'ONSITE', locations: ['London, United Kingdom'] }, defaultSearchPreferences(), now).status).toBe('INELIGIBLE');
  expect(evaluateJob({ ...job, remote: 'ONSITE', locations: [] }, defaultSearchPreferences(), now).status).toBe('UNVERIFIED');
});
it('does not mark a source outage or missing page as closure; distinguishes explicit closure/deadline', () => {
  expect(evaluateJob({ ...job, checkError: 'Source unavailable' }, defaultSearchPreferences(), now).status).toBe('SOURCE_ERROR');
  expect(evaluateJob({ ...job, availability: 'CLOSED' }, defaultSearchPreferences(), now).status).toBe('EXPIRED');
  expect(evaluateJob({ ...job, deadline: '2026-10-26T12:00:00.000Z' }, defaultSearchPreferences(), now).status).toBe('EXPIRED');
});
it('filters seven rolling days with future and absent dates unverified rather than recent', () => {
  const jobs = [job, { ...job, key: 'old', publishedAt: '2026-10-01T00:00:00.000Z' }, { ...job, key: 'unknown', publishedAt: null, publicationKind: 'UNKNOWN' as const }];
  expect(filterJobs(jobs, defaultSearchPreferences(), now).map(j => j.key)).toEqual([job.key, 'unknown']);
  expect(evaluateJob({ ...job, publishedAt: '2026-10-29T00:00:00.000Z' }, defaultSearchPreferences(), now).status).toBe('UNVERIFIED');
});
it('filters disclosed comparable salary only on request and keeps unknown currency/period information', () => {
  const low = { ...job, salary: [{ min: 12000, max: 24000, currency: 'USD', period: 'year' as const }] };
  const p = { ...defaultSearchPreferences(), hideBelowSalary: true };
  expect(filterJobs([low, job, { ...low, key: 'currency', salary: [{ min: 10, max: 20, currency: 'ZAR', period: 'month' as const }] }], p, now).map(j => j.key)).toEqual([job.key, 'currency']);
});
it('reads profile preferences without adding qualifications or inferring authorization', () => {
  const p = preferencesFromProfile({ titles: ['React Developer'], locations: ['South Africa'], timeZone: 'Africa/Johannesburg', overlapZones: ['Europe/London'], salary: { min: 40000, max: 60000, currency: 'ZAR', period: 'month' }, hoursPerWeek: 40, workingHours: '09:00–17:00' });
  expect(p.titles).toEqual(['React Developer']); expect(p.salaryCurrency).toBe('ZAR'); expect(p.fullTimeTarget).toBe(40000); expect(p.lacksAuthorization).toEqual([]);
});
it('deduplicates canonical employer URLs and stable aliases while retaining rejection on updates', () => {
  const first = mergeJobs([], [job], now); first[0].review = 'DISMISSED';
  const updated = { ...job, updatedAt: now, title: 'Updated role', url: job.url + '?utm_source=feed' };
  const alternate = { ...updated, source: 'manual' as const, key: 'manual:manual:other', sourceId: 'other', board: 'manual' };
  const result = mergeJobs(first, [updated, alternate], now);
  expect(result).toHaveLength(1); expect(result[0].review).toBe('DISMISSED'); expect(result[0].aliases).toContain('manual:manual:other');
});
it('canonicalization preserves distinct job IDs while removing only known tracking data', () => {
  expect(canonicalUrl('https://careers.example.com/jobs?gh_jid=123&utm_source=a')).toBe('https://careers.example.com/jobs?gh_jid=123');
  expect(canonicalUrl('https://careers.example.com/jobs?gh_jid=123')).not.toBe(canonicalUrl('https://careers.example.com/jobs?gh_jid=124'));
});
it('unifies an Ashby application URL with the job URL and merges previously separate alias groups without losing dismissal', () => {
  expect(canonicalUrl(job.url + '/application')).toBe(canonicalUrl(job.url!));
  let tracked = mergeJobs([], [job, { ...job, source: 'manual', board: 'manual', sourceId: 'second', key: 'manual:manual:second', url: 'https://careers.example.com/role' }], now);
  tracked[1].review='DISMISSED';
  tracked=mergeJobs(tracked,[{...job,url:'https://careers.example.com/role'}],now);
  expect(tracked).toHaveLength(1);expect(tracked[0].review).toBe('DISMISSED');
});
it('does not verify an unresolved visa or citizenship requirement', () => {
  expect(evaluateJob({...job,description:job.description+' British citizenship is required.'},defaultSearchPreferences(),now).status).toBe('UNVERIFIED');
});
it('does not turn a restriction on hiring outside South Africa into an exclusion of South Africa',()=>{
  const j={...job,description:'We do not hire outside South Africa.'};
  expect(evaluateJob(j,defaultSearchPreferences(),now).status).not.toBe('INELIGIBLE');
});
it.each(['We are hiring outside South Africa.','We are hiring in South Africa. Applicants must be based in Germany.','We are hiring in South Africa. Candidates must hold permanent residency in the UK.','We hire in South Africa. Only British citizens may apply.','We hire in South Africa. You must have the right to work in the UK.','We hire in South Africa. You must live in Canada.'])('never verifies contrary or unresolved geographic requirements: %s',description=>{
  expect(evaluateJob({...job,description},defaultSearchPreferences(),now).status).not.toBe('VERIFIED');
});
it('fully remote filter excludes confirmed hybrid/onsite status but retains unknown remote evidence',()=>{
  const jobs=[{...job,remote:'HYBRID' as const},{...job,remote:'ONSITE' as const,locations:[]},{...job,key:'unknown',remote:'UNKNOWN' as const}];
  expect(filterJobs(jobs,defaultSearchPreferences(),now).map(j=>j.key)).toEqual(['unknown']);
});
it('rejects impossible source dates rather than accepting JavaScript date rollover', () => {
  expect(()=>validateJob({...job,publishedAt:'2026-02-30T12:00:00Z'})).toThrow();
});
it('matches developer/engineer title variants without claiming candidate qualifications',()=>{
  expect(filterJobs([{...job,title:'Senior Frontend Engineer'}],defaultSearchPreferences(),now)).toHaveLength(1);
});
it('supports safe sign-in return to discovery without opening arbitrary resource routes',()=>{
  expect(safeNext('?next=/jobs')).toBe('/jobs');expect(safeNext('?next=/api/jobs')).toBe('/');
});
it('filters explicit location and overlap hints only when requested, retaining unknown evidence',()=>{
  const p={...defaultSearchPreferences(),locationQuery:'London',filterOverlap:true,overlapZones:['Europe/London']};
  const unknown={...job,key:'unknown',locations:[],description:'React remote role'};
  const pacific={...job,key:'pacific',locations:['London'],description:'Core working hours require overlap with US Pacific time.'};
  const london={...job,key:'london',locations:['London'],description:'Working hours require UK overlap.'};
  expect(filterJobs([unknown,pacific,london],p,now).map(j=>j.key)).toEqual(['unknown','london']);
});
it.each(['http://example.com/jobs', 'https://127.0.0.1/jobs', 'https://[::1]/jobs', 'https://localhost/jobs', 'https://user:pass@example.com/jobs', 'https://2130706433/jobs', 'javascript:alert(1)', 'https://x.local/jobs'])('rejects unsafe manual import URLs: %s', async url => {
  await expect(importManualJob({ url, employer: 'Test', title: 'Developer', description: 'Synthetic' }, now)).rejects.toThrow();
});
it('imports unsupported public URLs as unverified records without fetching them', async () => {
  const result = await importManualJob({ url: 'https://careers.example.com/job/1', employer: 'Test', title: 'Frontend Developer', description: '<script>alert(1)</script>React required' }, now);
  expect(result.availability).toBe('UNKNOWN'); expect(result.publishedAt).toBeNull(); expect(result.source).toBe('manual');
  expect(recognizeJobUrl('https://jobs.ashbyhq.com/Ashby/job-1/apply')).toEqual({ source: 'ashby', board: 'Ashby', id: 'job-1' });
  expect(() => validateJob({ ...job, publishedAt: 'not a date' })).toThrow();
});
it('keeps a URL-only unclassified manual import discoverable under default title preferences',async()=>{
  const result=await importManualJob({url:'https://careers.example.com/unclassified-role',employer:'',title:'',description:''},now);
  expect(filterJobs([result],defaultSearchPreferences(),now)).toHaveLength(1);
});
