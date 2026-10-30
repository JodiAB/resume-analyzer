// Read-only analysis of the original public listing snapshot; never refreshes its dates.
import {createServer} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
const out=new URL('../../../outputs/',import.meta.url);
const snapshot=JSON.parse(await readFile(new URL('milestone-6-live-jobs.json',out),'utf8'));
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
try {
 const {evaluateJob}=await server.ssrLoadModule('/app/features/jobs/eligibility.ts');
 const {defaultSearchPreferences,filterJobs}=await server.ssrLoadModule('/app/features/jobs/preferences.ts');
 const {mergeJobs}=await server.ssrLoadModule('/app/features/jobs/dedup.ts');
 const {seniorityLevel}=await server.ssrLoadModule('/app/features/matching/requirements.ts');
 const prefs=defaultSearchPreferences();
 const normalize=s=>s.toLowerCase().replace(/[-_]/g,' ').replace(/\bdeveloper\b/g,'engineer').replace(/\bfront end\b/g,'frontend').replace(/\bfullstack\b/g,'full stack').replace(/\s+/g,' ').trim();
 const analyze=at=>{
  const records=snapshot.jobs.map(j=>{
   const age=j.publishedAt?Date.parse(at)-Date.parse(j.publishedAt):NaN;
   const evaluation=evaluateJob(j,prefs,at);
   const maxima=j.salary.flatMap(s=>s.currency==='USD'&&s.period==='month'?[s.max]:s.currency==='USD'&&s.period==='year'?[s.max/12]:[]);
   const target=/part.?time/i.test(j.employmentType||'')?1500:3000;
   return {key:j.key,title:j.title,source:j.source,board:j.board,publishedAt:j.publishedAt,publicationKind:j.publicationKind,freshness:!Number.isFinite(age)?'MISSING':age<0?'FUTURE':age<=7*86400000?'FRESH':'STALE',titleMatches:prefs.titles.some(t=>normalize(j.title).includes(normalize(t))),seniority:seniorityLevel(j.title),seniorityMismatch:['Senior','Lead','Principal'].includes(seniorityLevel(j.title)),belowComparableSalaryTarget:maxima.length?maxima.every(n=>n<target):null,closed:j.availability==='CLOSED'||!!(j.deadline&&Date.parse(j.deadline)<Date.parse(at)),evaluation};
  });
  const count=f=>records.filter(f).length;
  const reasons={};for(const r of records)for(const reason of r.evaluation.reasons)reasons[reason]=(reasons[reason]||0)+1;
  return {at,total:records.length,counts:{fresh:count(r=>r.freshness==='FRESH'),stale:count(r=>r.freshness==='STALE'),missingPublicationDates:count(r=>r.freshness==='MISSING'),futurePublicationDates:count(r=>r.freshness==='FUTURE'),saEligible:count(r=>r.evaluation.saEligibility==='ELIGIBLE'),saIneligible:count(r=>r.evaluation.saEligibility==='INELIGIBLE'),saUnknown:count(r=>r.evaluation.saEligibility==='UNKNOWN'),matchingTitles:count(r=>r.titleMatches),mismatchingTitles:count(r=>!r.titleMatches),seniorityMismatches:count(r=>r.seniorityMismatch),seniorityUnknown:count(r=>!r.seniority),belowComparableSalaryTarget:count(r=>r.belowComparableSalaryTarget===true),salaryNotComparable:count(r=>r.belowComparableSalaryTarget===null),actualSalaryExclusions:0,closed:count(r=>r.closed),duplicates:records.length-mergeJobs([],snapshot.jobs,at).length,fullyVerified:count(r=>r.evaluation.status==='VERIFIED'),visibleWithDefaultFilters:filterJobs(snapshot.jobs,prefs,at).length},reasonCounts:reasons,records};
 };
 const report={definitions:['Counts are orthogonal, not an additive exclusion funnel.','Seniority mismatch means an explicit Senior/Lead/Staff/Principal title against the authorized synthetic 2–4-year target; unknown titles are not presumed suitable.','Salary comparison uses advertised USD maximum, annual divided by 12; defaults do not hide low salaries.','Unknown SA evidence is not ineligibility. Active feed presence does not guarantee an application remains open.'],originalSnapshot:analyze(snapshot.at),currentAgeOnly:analyze(new Date().toISOString())};
 await writeFile(new URL('milestone-6a-discovery-diagnosis.json',out),JSON.stringify(report,null,2));
 console.log(JSON.stringify({originalAt:snapshot.at,counts:report.originalSnapshot.counts,reasons:report.originalSnapshot.reasonCounts},null,2));
}finally{await server.close();}
