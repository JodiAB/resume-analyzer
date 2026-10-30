import {canonicalUrl,type Job} from '../jobs/model';
import {getBoard} from '../jobs/boards';
import {recognizeJobUrl} from '../jobs/manual';
export function officialDestination(job:Job,input=job.url||''):string {
 if(job.source==='manual'||!job.url||!input||/%|\\|\s/.test(input)||/\/(?:\.|\.\.)(?:\/|$)/.test(input))throw new Error('Unverified official destination');
 const reviewed=getBoard(job.source,job.board);
 const normalized=(raw:string)=>{const u=new URL(canonicalUrl(raw));const ids=u.searchParams.getAll('gh_jid');if(job.source==='greenhouse'&&ids.length===1&&ids[0]===job.sourceId)u.searchParams.delete('gh_jid');return u;};
 const url=normalized(input);
 const hosts=job.source==='greenhouse'?[reviewed.applicationHost||'job-boards.greenhouse.io']:job.source==='lever'?['jobs.lever.co','jobs.eu.lever.co']:['jobs.ashbyhq.com'];
 const path=job.source==='greenhouse'?`/${job.board}/jobs/${job.sourceId}`:`/${job.board}/${job.sourceId}`;
 if(!hosts.includes(url.hostname)||url.pathname!==path||url.search||url.hash||url.protocol!=='https:')throw new Error('Destination does not match reviewed vacancy');
 const original=normalized(job.url);if(original.hostname!==url.hostname||original.pathname!==path||original.search)throw new Error('Source destination mismatch');return url.href;
}
export function vacancyIdentity(job:Job):string {
 if(job.source!=='manual')return `ats:${job.source}:${job.board}:${job.sourceId}`;
 if(job.url){const known=recognizeJobUrl(job.url);if(known)return `ats:${known.source}:${known.board}:${known.id}`;const u=new URL(canonicalUrl(job.url));return `url:${u.origin}${u.pathname}`;}
 return `job:${job.key}`;
}
