// Explicit opt-in preload for the browser acceptance server only. Not part of
// public assets or production imports. No live network calls are made here.
import { gh, lever, ashby } from '../tests/fixtures/jobs.ts';
if(process.env.JOBPILOT_TEST_FEEDS!=='synthetic-only')throw new Error('Synthetic test transport requires explicit opt-in');
const realFetch=globalThis.fetch;let ashbyCalls=0;
const recent=new Date(Date.now()-86400000).toISOString();
globalThis.fetch=async(input,options)=>{
  const u=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
  if(u.hostname==='boards-api.greenhouse.io'){
    // The original three-source acceptance fixture remains unchanged. Newly
    // reviewed boards are explicitly empty in this deterministic scenario.
    if(!u.pathname.startsWith('/v1/boards/greenhouse/'))return response({jobs:[],meta:{total:0}});
    if(/\/jobs\/123$/.test(u.pathname))return response({},404);
    const jobs=[{...gh,first_published:recent},{...gh,id:124,absolute_url:'https://job-boards.greenhouse.io/greenhouse/jobs/124',title:'React Developer - US only',content:'Remote US only. React required.',first_published:recent},{...gh,id:125,absolute_url:'https://job-boards.greenhouse.io/greenhouse/jobs/125',title:'Software Engineer - old posting',first_published:'2020-01-01T00:00:00Z'}];
    return response({jobs,meta:{total:jobs.length}});
  }
  if(u.hostname==='api.lever.co')return response([lever]);
  if(u.hostname==='api.ashbyhq.com'){
    if(!u.pathname.includes('/Ashby'))return response({jobs:[]});
    ashbyCalls++;if(ashbyCalls>1)return response({},503);
    return response({jobs:[{...ashby,publishedAt:recent},{...ashby,id:'unlisted-secret',title:'Unlisted synthetic job',isListed:false}]});
  }
  if(u.hostname==='127.0.0.1'||u.hostname==='localhost')return realFetch(input,options);
  throw new Error('External network blocked by synthetic acceptance transport');
};
