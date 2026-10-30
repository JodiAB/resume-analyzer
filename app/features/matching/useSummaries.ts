import {useEffect,useState} from 'react';
import {captureSession} from '../../lib/puter';
import {currentProfileRepository} from '../profile/repository';
import {currentJobsRepository} from '../jobs/repository';
import type {TrackedJob} from '../jobs/model';
import {currentMatchRepository} from './repository';
import {resolveMatchContext} from './service';
import type {Assessment} from './types';
export function useMatchSummaries(jobs:TrackedJob[]){
  const [summaries,setSummaries]=useState<Record<string,Assessment>>({}),[warning,setWarning]=useState('');
  useEffect(()=>{let active=true;let generation=0;const a=captureSession();
    const load=async()=>{const turn=++generation;setSummaries({});try{const [profile,history,saved]=await Promise.all([currentProfileRepository().load(),currentMatchRepository().list(),currentJobsRepository().load()]);a();if(profile.conflict||!profile.latest){if(active&&turn===generation)setWarning('Qualification assessments require a single current candidate profile.');return;}
      const result:Record<string,Assessment>={};for(const t of jobs){const fresh=saved.jobs.find(j=>j.aliases.includes(t.job.key));if(!fresh||JSON.stringify(fresh.job)!==JSON.stringify(t.job))continue;for(const r of history.filter(r=>r.jobKey===fresh.job.key).sort((a,b)=>b.analyzedAt.localeCompare(a.analyzedAt))){const assessment=await resolveMatchContext(r,{profile:profile.latest,job:fresh.job,preferences:saved.preferences},new Date().toISOString());a();if(!active||turn!==generation)return;if(assessment){result[t.job.key]=assessment;break;}}}
      if(active&&turn===generation){setSummaries(result);setWarning(history.length?'Only current assessments are shown. Profile, source, preferences or date changes require reanalysis.':'Select a job to assess qualifications.');}
    }catch{if(active&&turn===generation){setSummaries({});setWarning('Qualification history could not be verified; scores hidden. Discovery remains available.');}}};
    void load();const focus=()=>void load();window.addEventListener('focus',focus);const timer=window.setInterval(focus,60000);return()=>{active=false;generation++;window.removeEventListener('focus',focus);window.clearInterval(timer);};
  },[jobs]);return {summaries,warning};
}
