// Current public GET-only scan. No candidate records, cookies or applications.
import {createServer} from 'vite';import {writeFile} from 'node:fs/promises';
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
try{
 const {boards}=await server.ssrLoadModule('/app/features/jobs/boards.ts');
 const {createJobService}=await server.ssrLoadModule('/app/features/jobs/service.server.ts');
 const {evaluateJob}=await server.ssrLoadModule('/app/features/jobs/eligibility.ts');
 const {defaultSearchPreferences}=await server.ssrLoadModule('/app/features/jobs/preferences.ts');
 const {mergeJobs}=await server.ssrLoadModule('/app/features/jobs/dedup.ts');
 const {parseRequirements,seniorityLevel}=await server.ssrLoadModule('/app/features/matching/requirements.ts');
 const {officialDestination}=await server.ssrLoadModule('/app/features/applications/destination.ts');
 const at=new Date().toISOString(),prefs=defaultSearchPreferences(),sources=[],jobs=[];
 const service=createJobService({pageSize:1000,timeoutMs:25000});
 for(const b of boards){try{const p=await service.discover({source:b.source,board:b.board});jobs.push(...p.jobs);sources.push({...b,status:p.complete?'PASS':'BLOCKED',count:p.jobs.length,complete:p.complete});}catch(e){sources.push({...b,status:'BLOCKED',error:e.code||e.name,count:0});}}
 const unique=mergeJobs([],jobs,at).map(t=>t.job);
 const records=unique.map(j=>{
  const e=evaluateJob(j,prefs,at),age=j.publishedAt?Date.parse(at)-Date.parse(j.publishedAt):NaN,within=Number.isFinite(age)&&age>=0&&age<=7*86400000;
  const originalFresh=within&&j.publicationKind==='FIRST_PUBLISHED';
  const technical=/engineer|developer/i.test(j.title)&&/front.?end|full.?stack|react|next\.?js|typescript|ai application/i.test(j.title+' '+j.skills.join(' '));
  const req=parseRequirements(j),level=seniorityLevel(j.title),required=req.experience.filter(x=>x.importance==='REQUIRED').map(x=>x.years).filter(x=>x!==null);
  const experienceMismatch=required.some(n=>n>4)||['Senior','Lead','Principal'].includes(level);
  const reasons=[];if(!originalFresh)reasons.push(j.publicationKind==='LAST_PUBLISHED'?'Original posting date unknown: source reports last publication, not original posting.':j.publishedAt?'Outside seven-day original-publication window.':'Original publication date missing.');
  if(e.saEligibility!=='ELIGIBLE')reasons.push('SA eligibility '+e.saEligibility+'.');if(!technical)reasons.push('No target developer-title/technology intersection.');if(experienceMismatch)reasons.push('Explicit seniority or mandatory years exceed the disclosed 2–4-year target.');
  if(e.status!=='VERIFIED')reasons.push(...e.reasons);
  return {key:j.key,title:j.title,employer:j.employer,source:j.source,board:j.board,url:j.url,publishedAt:j.publishedAt,publicationKind:j.publicationKind,originalFresh,recentLastPublication:within&&j.publicationKind==='LAST_PUBLISHED',stale:Number.isFinite(age)&&age>7*86400000,saEligibility:e.saEligibility,eligibilityEvidence:e.evidence,status:e.status,technicalPreferenceIntersection:technical,experienceMismatch,requiredYears:required,seniority:level,destination:{status:'NOT TESTED'},decision:reasons.length?'REVIEW_OR_EXCLUDE':'ACCEPT_FOR_MANUAL_SHORTLIST',reasons};
 });
 const promising=records.filter(r=>r.technicalPreferenceIntersection&&(r.originalFresh||r.recentLastPublication||r.saEligibility==='ELIGIBLE')).slice(0,16);
 for(const r of promising){const j=unique.find(j=>j.key===r.key);try{const url=officialDestination(j);const response=await fetch(url,{method:'GET',credentials:'omit',redirect:'manual',signal:AbortSignal.timeout(15000)});r.destination={status:response.status===200?'PASS':'BLOCKED',http:response.status,scope:'Exact official application URL GET only; form functionality and submission not tested'};}catch(e){r.destination={status:'BLOCKED',error:e.name};}}
 const count=f=>records.filter(f).length;
 const report={at,scope:'Current public boards; no synthetic jobs. Technical overlap is a preference probe, not a claim of candidate qualifications. Last-publication freshness is separated from original-posting freshness.',newBoards:3,configuredBoards:boards.length,sources,totalUnique:records.length,duplicateSnapshots:jobs.length-records.length,counts:{freshOriginal:count(r=>r.originalFresh),recentLastPublicationOriginalUnknown:count(r=>r.recentLastPublication),confirmedSALocationConsideration:count(r=>r.saEligibility==='ELIGIBLE'),freshAndConfirmedSA:count(r=>r.originalFresh&&r.saEligibility==='ELIGIBLE'),freshUnknownSA:count(r=>r.originalFresh&&r.saEligibility==='UNKNOWN'),staleConfirmedSA:count(r=>r.stale&&r.saEligibility==='ELIGIBLE'),confirmedIneligible:count(r=>r.saEligibility==='INELIGIBLE'),closed:count(r=>r.status==='EXPIRED'),unverifiableOriginalDate:count(r=>r.publicationKind!=='FIRST_PUBLISHED'||!r.publishedAt),technicalPreferenceIntersection:count(r=>r.technicalPreferenceIntersection),technicalWithoutExplicitExperienceMismatch:count(r=>r.technicalPreferenceIntersection&&!r.experienceMismatch),verifiedActiveDestinations:count(r=>r.destination.status==='PASS'),destinationsAttempted:promising.length,acceptedForManualShortlist:count(r=>r.decision==='ACCEPT_FOR_MANUAL_SHORTLIST')},records};
 await writeFile('../../outputs/milestone-6a-cont-discovery.json',JSON.stringify(report,null,2));await writeFile('../../outputs/milestone-6a-cont-live-jobs.json',JSON.stringify({at,jobs:unique},null,2));console.log(JSON.stringify({sources,totalUnique:report.totalUnique,counts:report.counts},null,2));
}finally{await server.close();}
