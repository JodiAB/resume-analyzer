// Public GETs only, no Puter/candidate state and no employer submissions.
import { createServer } from 'vite';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
const requests=[];const results=[];
try{
  const {createJobService}=await server.ssrLoadModule('/app/features/jobs/service.server.ts');
  const service=createJobService({fetch:async(url,options)=>{const response=await fetch(url,options);requests.push({url,method:options.method,status:response.status,credentials:options.credentials});return response;}});
  for(const [source,board] of [['greenhouse','greenhouse'],['lever','lever'],['ashby','Ashby']]){
    try{const page=await service.discover({source,board,offset:0});results.push({source,board,result:'PASS',returned:page.jobs.length,complete:page.complete,nextOffset:page.nextOffset,checkedAt:page.checkedAt,publicationKinds:[...new Set(page.jobs.map(j=>j.publicationKind))],withSalary:page.jobs.filter(j=>j.salary.length).length,withPublication:page.jobs.filter(j=>j.publishedAt).length});
      if(source==='greenhouse'&&page.jobs[0]){const detail=await service.discover({source,board,id:page.jobs[0].sourceId});results.push({source,board,result:'PASS',check:'individual posting and optional pay transparency',returned:detail.jobs.length,withSalary:detail.jobs.filter(j=>j.salary.length).length});}
    }catch(error){results.push({source,board,result:'SOURCE_ERROR',code:error?.code||error?.name||'Error'});}
  }
  await mkdir(resolve('../../outputs'),{recursive:true});await writeFile(resolve('../../outputs/milestone-2-provider-checks.json'),JSON.stringify({at:new Date().toISOString(),kind:'Live documented public ATS GETs using actual adapters; not candidate eligibility or application acceptance certification',requests,results},null,2));
  console.log(JSON.stringify(results,null,2));
}finally{await server.close();}
