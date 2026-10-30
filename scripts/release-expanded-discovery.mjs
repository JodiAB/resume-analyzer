import {createServer} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
try{
 const {normalizePosting}=await server.ssrLoadModule('/app/features/jobs/adapters.server.ts');
 const {getBoard}=await server.ssrLoadModule('/app/features/jobs/boards.ts');
 const {evaluateJob}=await server.ssrLoadModule('/app/features/jobs/eligibility.ts');
 const {defaultSearchPreferences,filterJobs}=await server.ssrLoadModule('/app/features/jobs/preferences.ts');
 const {officialDestination}=await server.ssrLoadModule('/app/features/applications/destination.ts');
 const now=new Date().toISOString(),prefs=defaultSearchPreferences(),results=[];
 for(const name of ['koboldmetals','workwize']){
  const raw=JSON.parse(await readFile('../../outputs/milestone-6a-raw-'+name+'.json','utf8'));
  const jobs=raw.jobs.map(r=>normalizePosting(getBoard('greenhouse',name),r,now)).filter(Boolean);
  const records=jobs.map(j=>{const e=evaluateJob(j,prefs,now);const age=Date.parse(now)-Date.parse(j.publishedAt);return {key:j.key,title:j.title,publishedAt:j.publishedAt,fresh:!!j.publishedAt&&age>=0&&age<=7*86400000,saEligibility:e.saEligibility,status:e.status,reasons:e.reasons,evidence:e.evidence,url:officialDestination(j),locations:j.locations,skills:j.skills};});
  results.push({board:name,total:jobs.length,fresh:records.filter(r=>r.fresh).length,missingDates:jobs.filter(j=>!j.publishedAt).length,saEligible:records.filter(r=>r.saEligibility==='ELIGIBLE').length,saUnknown:records.filter(r=>r.saEligibility==='UNKNOWN').length,saIneligible:records.filter(r=>r.saEligibility==='INELIGIBLE').length,freshSAEligible:records.filter(r=>r.fresh&&r.saEligibility==='ELIGIBLE').length,fullyVerified:records.filter(r=>r.status==='VERIFIED').length,defaultFilterVisible:filterJobs(jobs,prefs,now).length,records});
 }
 await writeFile('../../outputs/milestone-6a-expanded-discovery.json',JSON.stringify({at:now,scope:'Public feed snapshots retrieved during this phase, normalized through production adapters. Role eligibility independent from qualification and freshness. No applications.',results},null,2));
 console.log(JSON.stringify(results.map(({records,...r})=>r),null,2));
}finally{await server.close();}
