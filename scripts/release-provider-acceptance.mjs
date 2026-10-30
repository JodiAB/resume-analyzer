// Live documented public ATS GET acceptance. Never sends candidate state.
import {createServer} from 'vite';
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=resolve('../../outputs'),requests=[],results=[],jobs=[],now=new Date().toISOString();
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
try{
 const {createJobService}=await server.ssrLoadModule('/app/features/jobs/service.server.ts');
 const {evaluateJob}=await server.ssrLoadModule('/app/features/jobs/eligibility.ts');
 const {defaultSearchPreferences,filterJobs}=await server.ssrLoadModule('/app/features/jobs/preferences.ts');
 const {mergeJobs}=await server.ssrLoadModule('/app/features/jobs/dedup.ts');
 const {officialDestination}=await server.ssrLoadModule('/app/features/applications/destination.ts');
 const service=createJobService({pageSize:1000,fetch:async(url,options)=>{const r=await fetch(url,options);requests.push({url,method:options.method,status:r.status,credentials:options.credentials});return r;}}),prefs=defaultSearchPreferences();
 for(const [source,board] of [['greenhouse','greenhouse'],['lever','lever'],['ashby','Ashby']]){
  try{
   const page=await service.discover({source,board});jobs.push(...page.jobs);
   const evaluated=page.jobs.map(job=>({key:job.key,title:job.title,url:job.url,remote:job.remote,publishedAt:job.publishedAt,publicationKind:job.publicationKind,checkedAt:job.checkedAt,salary:job.salary,evaluation:evaluateJob(job,prefs,now)}));
   const repeated=mergeJobs(mergeJobs([],page.jobs,now),page.jobs,now);
   results.push({source,board,status:'PASS',scope:'Live public board availability and normalization, not candidate eligibility',count:page.jobs.length,complete:page.complete,nextOffset:page.nextOffset,dedupStable:repeated.length===page.jobs.length,remote:page.jobs.filter(j=>j.remote==='REMOTE').length,publishedWithinSevenDays:page.jobs.filter(j=>j.publishedAt&&Date.parse(now)-Date.parse(j.publishedAt)>=0&&Date.parse(now)-Date.parse(j.publishedAt)<=7*86400000).length,unknownDates:page.jobs.filter(j=>!j.publishedAt).length,explicitSouthAfricaEligible:evaluated.filter(j=>j.evaluation.saEligibility==='ELIGIBLE').length,fullyVerified:evaluated.filter(j=>j.evaluation.status==='VERIFIED').length,withStructuredSalary:page.jobs.filter(j=>j.salary.length).length,evaluated});
   if(page.jobs[0]){
    const detail=await service.discover({source,board,id:page.jobs[0].sourceId});results.push({source,board,check:'live individual recheck',status:detail.jobs.some(j=>j.sourceId===page.jobs[0].sourceId)?'PASS':'BLOCKED',missing:detail.missing});
    let url;try{url=officialDestination(page.jobs[0]);}catch{results.push({source,check:'official URL validation',status:'FAIL'});}
    if(url){try{const r=await fetch(url,{method:'GET',redirect:'manual',credentials:'omit',signal:AbortSignal.timeout(15000)});requests.push({url,method:'GET',status:r.status,credentials:'omit'});results.push({source,check:'original public application page GET; no candidate data',status:r.status===200?'PASS':'BLOCKED',http:r.status,redirect:r.headers.get('location')});}catch(error){results.push({source,check:'original page GET',status:'BLOCKED',error:error.name});}}
   }
   const absent=await service.discover({source,board,id:source==='greenhouse'?'999999999999999':'00000000-0000-4000-8000-000000000000'});results.push({source,check:'nonexistent synthetic identifier, not a known expired vacancy',status:absent.missing?'PASS':'BLOCKED',missing:absent.missing});
  }catch(error){results.push({source,board,status:'BLOCKED',error:error.code||error.name});}
 }
 await mkdir(out,{recursive:true});
 await writeFile(resolve(out,'milestone-6-live-jobs.json'),JSON.stringify({at:now,jobs},null,2));
 const technical=jobs.filter(j=>j.remote==='REMOTE'&&/engineer|developer/i.test(j.title)&&evaluateJob(j,prefs,now).status!=='INELIGIBLE');
 const selected=technical.find(j=>j.publishedAt&&Date.parse(now)-Date.parse(j.publishedAt)<=7*86400000)||technical[0]||null;
 const report={at:now,kind:'Live public GETs and actual adapters. Absence probes do not establish historical expiration. No model or private candidate data.',requests,results,selectedForControlledJourney:selected,coverage:{configuredEmployerBoards:3,totalListings:jobs.length,technicalRemoteNotExplicitlyExcluded:technical.length,verifiedSARecent:jobs.filter(j=>evaluateJob(j,prefs,now).status==='VERIFIED').length},knownExpiredVacancy:'NOT TESTED: no previously observed live expired identifier supplied'};
 await writeFile(resolve(out,'milestone-6-live-providers.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,results:results.map(({evaluated,...r})=>r),selectedForControlledJourney:selected?{key:selected.key,title:selected.title}:null},null,2));
}finally{await server.close();}
