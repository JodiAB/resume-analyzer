import type {Job} from '../jobs/model';
import type {Constraint,MatchConfig} from './types';
export function salaryConstraint(job:Job,c:MatchConfig):Constraint {
  const bands=job.salary.filter(s=>s.currency===c.salaryCurrency).flatMap(s=>s.period===c.salaryPeriod?[{min:s.min,max:s.max}]:s.period==='year'&&c.salaryPeriod==='month'?[{min:s.min/12,max:s.max/12}]:s.period==='month'&&c.salaryPeriod==='year'?[{min:s.min*12,max:s.max*12}]:[]);
  const status=!bands.length?'UNKNOWN':bands.every(s=>s.max<c.salaryTarget)?'CONFLICT':bands.every(s=>s.min>=c.salaryTarget)?'COMPATIBLE':'UNKNOWN';
  return {status,mandatory:c.salaryMandatory,explanation:!bands.length?'No comparable disclosed salary. No FX or hourly conversion inferred.':status==='CONFLICT'?'All comparable salary maxima are below your target.':status==='COMPATIBLE'?'All comparable disclosed salary minima meet your target.':'The disclosed range crosses your target or bands disagree; an actual offer is unknown.'};
}
export function clockMinutes(s:string):number {if(!/^\d\d:\d\d$/.test(s))throw new Error('Use HH:MM');const [h,m]=s.split(':').map(Number);if(h>23||m>59)throw new Error('Invalid clock time');return h*60+m;}
export function windowOverlap(candidateZone:string,start:string,end:string,jobZone:string,jobStart:string,jobEnd:string,date:string){
  const a=clockMinutes(start),b=clockMinutes(end),x=clockMinutes(jobStart),y=clockMinutes(jobEnd);if(a>=b||x>=y)throw new Error('Overnight/empty windows require manual review');
  const formatter=(timeZone:string)=>new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const fa=formatter(candidateZone),fb=formatter(jobZone);const begin=Date.parse(date+'T00:00:00Z');if(!Number.isFinite(begin))throw new Error('Invalid overlap date');
  const days:Record<string,number>={};for(let n=0;n<7;n++){const d=new Date(begin+n*86400000);if(d.getUTCDay()!==0&&d.getUTCDay()!==6)days[d.toISOString().slice(0,10)]=0;}
  const local=(f:Intl.DateTimeFormat,t:number)=>{const p=Object.fromEntries(f.formatToParts(t).map(v=>[v.type,v.value]));return {day:`${p.year}-${p.month}-${p.day}`,weekday:p.weekday,minute:Number(p.hour)*60+Number(p.minute)};};
  for(let t=begin-86400000;t<begin+8*86400000;t+=60000){const ca=local(fa,t);if(!(ca.day in days)||['Sat','Sun'].includes(ca.weekday)||ca.minute<a||ca.minute>=b)continue;const jo=local(fb,t);if(!['Sat','Sun'].includes(jo.weekday)&&jo.minute>=x&&jo.minute<y)days[ca.day]++;}
  return {minimumMinutes:Math.min(...Object.values(days)),maximumMinutes:Math.max(...Object.values(days)),days};
}
export function hoursConstraint(job:Job,c:MatchConfig,asOf:string):Constraint {
  const match=/\b(?:working hours|core hours|hours)\s*:\s*(\d\d:\d\d)\s*[-–]\s*(\d\d:\d\d)\s+(?:in\s+)?([A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?)/i.exec(job.description);
  if(!match||!c.workingStart||!c.workingEnd||!c.candidateTimeZone)return {status:'UNKNOWN',mandatory:c.hoursMandatory,explanation:'Exact supported job/candidate working windows are missing. No 9–5 schedule or ambiguous abbreviation is assumed.'};
  try {const o=windowOverlap(c.candidateTimeZone,c.workingStart,c.workingEnd,match[3],match[1],match[2],asOf.slice(0,10));return {status:o.minimumMinutes>=c.minimumOverlapHours*60?'COMPATIBLE':'CONFLICT',mandatory:c.hoursMandatory,explanation:`Next seven calendar dates, weekdays only: ${o.minimumMinutes/60}–${o.maximumMinutes/60} hours/day overlap; required target ${c.minimumOverlapHours}. IANA/DST rules applied. This is not a year-round guarantee.`};}
  catch{return {status:'UNKNOWN',mandatory:c.hoursMandatory,explanation:'Unsupported/overnight/invalid job window or time zone. Manual working-hour review required.'};}
}
