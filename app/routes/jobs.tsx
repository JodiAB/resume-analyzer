import { useEffect, useRef, useState } from 'react';
import PrivateBoundary from '../components/PrivateBoundary';
import Navbar from '../components/Navbar';
import { captureSession } from '../lib/puter';
import { currentProfileRepository } from '../features/profile/repository';
import { currentJobsRepository, jobCommand, type JobCommand } from '../features/jobs/repository';
import { boards } from '../features/jobs/boards';
import { fetchJobs } from '../features/jobs/client';
import { filterJobs, preferencesFromProfile, validateSearchPreferences, type SearchPreferences } from '../features/jobs/preferences';
import { importManualJob, recognizeJobUrl } from '../features/jobs/manual';
import { type Job, type TrackedJob, type Review } from '../features/jobs/model';
import { evaluateJob } from '../features/jobs/eligibility';
import JobCard from '../features/jobs/JobCard';
import SearchEditor from '../features/jobs/SearchEditor';
import {useMatchSummaries} from '../features/matching/useSummaries';

function Discovery() {
  const [records,setRecords]=useState<TrackedJob[]>([]); const [preferences,setPreferences]=useState<SearchPreferences>(()=>preferencesFromProfile(null));
  const [busy,setBusy]=useState(true); const [blocked,setBlocked]=useState(false); const [error,setError]=useState(''); const [status,setStatus]=useState('Loading private discovery history…');
  const [view,setView]=useState('NEW'); const [next,setNext]=useState<Record<string,number|null>>({}); const [sourceMessages,setSourceMessages]=useState<Record<string,string>>({});
  const {summaries,warning:matchWarning}=useMatchSummaries(records);
  const [matchFilter,setMatchFilter]=useState('ALL'),[matchSort,setMatchSort]=useState('discovery');
  const [manual,setManual]=useState({url:'',employer:'',title:'',description:''});
  const pending=useRef<JobCommand|null>(null); const [hasPending,setHasPending]=useState(false); const mounted=useRef(true); const running=useRef(false);
  useEffect(()=>{
    mounted.current=true; const assertSession=captureSession();
    void Promise.all([currentJobsRepository().load(),currentProfileRepository().load()]).then(([saved,profile])=>{
      assertSession(); if(!mounted.current)return;
      if(profile.conflict&&!saved.hasPreferences)throw new Error('Profile conflict');
      setRecords(saved.jobs);setPreferences(saved.hasPreferences?saved.preferences:preferencesFromProfile(profile.latest?.preferences||null));setStatus('Ready to discover public jobs.');
    }).catch(()=>{if(mounted.current){setError('Private history or profile ownership could not be verified. Reload to retry; actions are blocked.');setBlocked(true);}}).finally(()=>{if(mounted.current)setBusy(false);});
    return()=>{mounted.current=false;};
  },[]);
  const perform=async(work:(assertSession:()=>void)=>Promise<void>)=>{
    if(running.current||blocked)return;running.current=true;setBusy(true);setError('');
    try {const assertSession=captureSession();await work(assertSession);assertSession();}
    catch {if(mounted.current)setError('Operation not confirmed. Existing history is retained. Check the source messages or retry the unchanged pending save. Invalid preferences, a history conflict or capacity limit also block saves.');}
    finally{running.current=false;if(mounted.current)setBusy(false);}
  };
  const persist=async(command:JobCommand,assertSession:()=>void)=>{
    assertSession();pending.current=command;setHasPending(true);
    const state=await currentJobsRepository().append(command);assertSession();if(!mounted.current)return;
    pending.current=null;setHasPending(false);setRecords(state.jobs);
  };
  const saveIncoming=async(jobs:Job[],assertSession:()=>void)=>{
    // Bounded batches keep individual private KV records small; prior successful
    // batches remain durable if a later group fails or identity changes.
    for(let i=0;i<jobs.length;i+=10){assertSession();await persist(jobCommand({jobs:jobs.slice(i,i+10)}),assertSession);}
  };
  const discover=()=>void perform(async assertSession=>{
    validateSearchPreferences(preferences);
    const pages=await Promise.allSettled(boards.map(b=>fetchJobs({...b,offset:0})));assertSession();if(!mounted.current)return;
    const incoming:Job[]=[];const messages:Record<string,string>={};const offsets:Record<string,number|null>={};
    pages.forEach((result,i)=>{const b=boards[i];const key=`${b.source}:${b.board}`;
      if(result.status==='fulfilled'){incoming.push(...result.value.jobs);offsets[key]=result.value.nextOffset;messages[key]=`${result.value.jobs.length} returned · checked ${result.value.checkedAt}${result.value.complete?' · final page':' · more pages available'}`;}
      else {messages[key]=result.reason instanceof Error&&result.reason.message.startsWith('Rate limited.')?result.reason.message:'SOURCE_ERROR — previous snapshots retained; no closure inferred.';incoming.push(...records.filter(t=>t.job.source===b.source&&t.job.board===b.board).map(t=>({...t.job,checkError:'Source unavailable'})));}
    });setSourceMessages(messages);setNext(offsets);await saveIncoming(incoming,assertSession);assertSession();if(mounted.current)setStatus('Discovery complete. Review saved job evidence before applying.');
  });
  const more=(source:string,board:string)=>void perform(async assertSession=>{
    const key=`${source}:${board}`;const offset=next[key];if(offset===null||offset===undefined)return;
    const page=await fetchJobs({source,board,offset});assertSession();await saveIncoming(page.jobs,assertSession);assertSession();if(mounted.current){setNext(v=>({...v,[key]:page.nextOffset}));setStatus('Additional page saved. Partial pages never imply closed vacancies.');}
  });
  const recheck=(t:TrackedJob)=>void perform(async assertSession=>{
    let job:Job;
    try {const page=await fetchJobs({source:t.job.source,board:t.job.board,id:t.job.sourceId});assertSession();job=page.missing?{...t.job,availability:'CLOSED',checkedAt:page.checkedAt,checkError:null}:page.jobs[0];if(!job)throw new Error('Missing evidence');}
    catch {assertSession();job={...t.job,checkError:'Source recheck failed'};}
    await persist(jobCommand({jobs:[job]}),assertSession);if(mounted.current)setStatus('Source recheck recorded. Review the current evidence.');
  });
  const review=(t:TrackedJob,state:Review)=>void perform(async assertSession=>{await persist(jobCommand({review:{key:t.job.key,state}}),assertSession);if(mounted.current)setStatus('Private review saved. Updated listings keep this decision.');});
  const importJob=()=>void perform(async assertSession=>{
    const known=manual.url?recognizeJobUrl(manual.url):null;
    if(known&&!manual.description.trim()){
      const page=await fetchJobs({source:known.source,board:known.board,id:known.id});assertSession();if(page.missing||!page.jobs.length)throw new Error('Posting unavailable');await saveIncoming(page.jobs,assertSession);
    }else{
      if(!manual.url.trim()&&!manual.description.trim())throw new Error('Supply URL or description');
      const job=await importManualJob(manual,new Date().toISOString());assertSession();await persist(jobCommand({jobs:[job]}),assertSession);
    }
    assertSession();if(mounted.current){setView('NEW');setStatus('Job imported. Manual content stays unverified; no application was submitted.');}
  });
  const now=new Date().toISOString();const historyView=['SAVED','SHORTLISTED','DISMISSED'].includes(view);
  const selected=records.filter(t=>view==='ALL'||view==='RECENT'||t.review===view).filter(t=>view!=='RECENT'||(evaluateJob(t.job,preferences,now).status==='VERIFIED'&&Date.parse(now)-Date.parse(t.job.checkedAt)<=86400000));
  const allowed=new Set((historyView?selected.map(t=>t.job).filter(j=>!preferences.search||`${j.title} ${j.description} ${j.employer}`.toLowerCase().includes(preferences.search.toLowerCase())):filterJobs(selected.map(t=>t.job),preferences,now)).map(j=>j.key));
  const visible=selected.filter(t=>allowed.has(t.job.key)).filter(t=>matchFilter==='ALL'||(matchFilter==='UNASSESSED'?!summaries[t.job.key]:summaries[t.job.key]?.recommendation===matchFilter)).sort((a,b)=>matchSort==='score'?(summaries[b.job.key]?.score??-1)-(summaries[a.job.key]?.score??-1):0);
  return <main className="min-h-screen bg-slate-50"><Navbar/><section className="mx-auto max-w-6xl px-4 py-10 flex flex-col gap-5">
    <div><p className="font-semibold text-indigo-700">JobPilot AI · Discovery</p><h1 className="mt-3">Find your next remote role</h1><p className="mt-4">Public employer feeds, explicit evidence and a private review history. Evidence-backed qualification assessments and manual review. No automatic applications.</p></div>
    <p role="status" aria-live="polite">{status}</p>{error&&<p role="alert" className="text-red-800">{error}</p>}
    {hasPending&&<div className="border rounded-xl p-3"><p>A save is unconfirmed. Retry this exact event before starting another action, or reload to inspect durable history.</p><button type="button" disabled={busy} className="border rounded p-2" onClick={()=>void perform(async a=>{if(pending.current)await persist(pending.current,a);})}>Retry unchanged save</button><button type="button" className="border rounded p-2 ml-3" onClick={()=>window.location.reload()}>Reload saved history</button></div>}
    <fieldset disabled={busy||blocked||hasPending} aria-busy={busy} className="flex flex-col gap-5 min-w-0">
      <SearchEditor value={preferences} change={setPreferences} save={()=>void perform(async a=>{const p=validateSearchPreferences(preferences);await persist(jobCommand({preferences:p}),a);if(mounted.current)setStatus('Search preferences saved privately.');})}/>
      <div className="flex flex-wrap gap-3"><button type="button" className="primary-button w-fit!" onClick={discover}>Discover jobs</button><p>Configured sources: Greenhouse, Lever and Ashby. Refresh is user initiated, bounded and cached; no background scraping.</p></div>
      <ul className="text-sm list-disc pl-5">{boards.map(b=>{const key=`${b.source}:${b.board}`;return <li key={key}>{b.employer} / {b.source}: {sourceMessages[key]||'Not fetched in this session'}{next[key]!==undefined&&next[key]!==null&&<button type="button" className="ml-3 underline" onClick={()=>more(b.source,b.board)}>Load more {b.employer} jobs</button>}</li>;})}</ul>
      <details className="border border-gray-200 rounded-xl p-5 bg-white"><summary className="font-semibold cursor-pointer">Manual job import</summary><p className="my-3">A configured ATS URL alone can be rechecked through its official public endpoint. Other URLs are never fetched; paste the description for manual review. Pasted data remains UNVERIFIED. Never paste CV data or credentials here.</p><div className="grid md:grid-cols-2 gap-3">{([['url','Job URL'],['employer','Employer'],['title','Job title']] as const).map(([key,label])=><div className="form-div" key={key}><label htmlFor={`manual-${key}`}>{label}</label><input id={`manual-${key}`} value={manual[key]} maxLength={key==='url'?2000:500} onChange={e=>setManual({...manual,[key]:e.target.value})}/></div>)}</div><label htmlFor="manual-description">Pasted job description</label><textarea id="manual-description" rows={5} maxLength={60000} value={manual.description} onChange={e=>setManual({...manual,description:e.target.value})}/><button type="button" className="border rounded-lg p-2 mt-3" onClick={importJob}>Import job</button></details>
      <div className="grid sm:grid-cols-2 gap-4"><div className="form-div"><label htmlFor="job-view">Job view</label><select id="job-view" className="border rounded-lg p-3 max-w-full" value={view} onChange={e=>setView(e.target.value)}><option value="NEW">New jobs</option><option value="RECENT">Recently verified jobs (24 hours)</option><option value="ALL">All discovery results</option><option value="SAVED">Saved</option><option value="SHORTLISTED">Shortlisted</option><option value="DISMISSED">Dismissed</option></select></div><div className="form-div"><label htmlFor="job-search">Search job text</label><input id="job-search" value={preferences.search} maxLength={500} onChange={e=>setPreferences({...preferences,search:e.target.value})}/></div></div>
<p>{matchWarning}</p><div className="grid sm:grid-cols-2 gap-4"><label>Match quality<select aria-label="Match quality" value={matchFilter} onChange={e=>setMatchFilter(e.target.value)}>{["ALL","RECOMMENDED","MANUAL_REVIEW","BLOCKED","LOWER_PRIORITY","UNASSESSED"].map(v=><option key={v}>{v}</option>)}</select></label><label>Match sort<select aria-label="Match sort" value={matchSort} onChange={e=>setMatchSort(e.target.value)}><option value="discovery">Discovery order</option><option value="score">Qualification score, highest first</option></select></label></div>
      <p>{visible.length} shown · {records.filter(t=>t.review==='NEW').length} new · {records.length} unique stored vacancies. {historyView?'Reviewed history ignores discovery age/eligibility filters so old decisions remain inspectable.':'Unknown eligibility, salary and dates remain clearly labeled for review.'}</p>
      {!visible.length&&<p>No jobs in this view. Check filters, inspect saved history, load another page or import an employer listing.</p>}
      <div className="grid lg:grid-cols-2 gap-5">{visible.map(t=><JobCard key={t.job.key} record={t} preferences={preferences} review={state=>review(t,state)} recheck={()=>recheck(t)} assessment={summaries[t.job.key]}/>)}</div>
    </fieldset>
    <details className="text-sm"><summary className="cursor-pointer">Verification statuses and release limits</summary><p>VERIFIED: recent public listed remote role with explicit SA eligibility and no unresolved mandatory restriction. UNVERIFIED: missing or ambiguous evidence. INELIGIBLE: confirmed incompatibility. EXPIRED: confirmed closure/deadline. SOURCE_ERROR: recheck failed, prior evidence retained. A public listing does not guarantee hiring, legitimacy or submission acceptance. Full live account isolation remains an OPEN release blocker.</p></details>
  </section></main>;
}
export default function Jobs(){return <PrivateBoundary><Discovery/></PrivateBoundary>;}
