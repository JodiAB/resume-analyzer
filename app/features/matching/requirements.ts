import type {Job} from '../jobs/model';
import type {Importance,Requirement,Requirements,SourceSpan} from './types';
import type {Claim} from '../profile/schema';
export const negatedEvidence=(c:Claim,target:string)=>new RegExp(`\\b(?:no|not|never|without|lack|lacking)\\b[^.\\n]{0,45}(?:${(skillPatterns[target]||qualificationPatterns[target]||taskPatterns[target])?.source||target.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'i').test(c.evidence?.quote||c.values.label);
export const skillPatterns:Record<string,RegExp>={
  React:/\bReact(?:\.js)?\b(?!\s+Native)/i,'React Native':/\bReact Native\b/i,'Next.js':/\bNext(?:\.js|JS)\b/i,TypeScript:/\bTypeScript\b/i,JavaScript:/\bJavaScript\b/i,'Node.js':/\bNode(?:\.js|JS)\b/i,
  Vue:/\bVue(?:\.js)?\b/i,Angular:/\bAngular\b/i,Express:/\bExpress(?:\.js)?\b/i,Python:/\bPython\b/i,SQL:/\bSQL\b/i,PostgreSQL:/\bPostgreSQL\b/i,MongoDB:/\bMongoDB\b/i,GraphQL:/\bGraphQL\b/i,AWS:/\bAWS\b/i,Azure:/\bAzure\b/i,Docker:/\bDocker\b/i,Git:/\bGit\b/i,HTML:/\bHTML\b/i,CSS:/\bCSS\b/i,Java:/\bJava\b(?!Script)/i,
};
export const taskPatterns:Record<string,RegExp>={accessibility:/\b(?:accessible interfaces|accessibility|WCAG)\b/i,testing:/\b(?:automated tests?|unit tests?|integration tests?|testing)\b/i,'REST APIs':/\bREST(?:ful)? APIs?\b/i,mentoring:/\bmentor(?:ing)?\b/i,performance:/\bperformance optimi[sz]ation\b/i,'CI/CD':/\bCI\/CD\b/i,'AI applications':/\bAI applications?\b/i,fintech:/\bfintech\b/i,healthcare:/\bhealthcare\b/i,ecommerce:/\be.?commerce\b/i};
export const qualificationPatterns:Record<string,RegExp>={'AWS Certified Developer':/\bAWS Certified Developer\b/i,'AWS Certified Solutions Architect':/\bAWS Certified Solutions Architect\b/i,PMP:/\bPMP\b/i,CISSP:/\bCISSP\b/i,"Bachelor's degree in Computer Science":/\b(?:bachelor'?s?|BSc)\b[^.\n]{0,50}\bcomputer science\b/i,"Bachelor's degree":/\bbachelor'?s?(?: degree)?\b|\bBSc\b/i,"Master's degree":/\bmaster'?s?(?: degree)?\b|\bMSc\b/i};
export const technologies=(s:string)=>Object.keys(skillPatterns).filter(k=>skillPatterns[k].test(s));
export const seniorityLevel=(s:string):string|null=>/\b(?:principal|staff)\b/i.test(s)?'Principal':/\blead\b/i.test(s)?'Lead':/\bsenior\b/i.test(s)?'Senior':/\b(?:mid[- ]level|intermediate)\b/i.test(s)?'Mid':/\b(?:junior|entry[- ]level|graduate)\b/i.test(s)?'Junior':null;
export function parseRequirements(job:Job):Requirements {
  const all:Requirement[]=[];let section:Importance='UNSPECIFIED';let limited=false;
  const add=(kind:Requirement['kind'],label:string,importance:Importance,span:SourceSpan,extra:Partial<Requirement>={})=>{const r:Requirement={id:`${kind}-${all.length}`,kind,label,importance,alternatives:[],years:null,experienceKind:null,...span,...extra};all.push(r);return r;};
  const segments=[...job.description.matchAll(/[^\n]+/g)].flatMap(line=>{let offset=line.index!;return line[0].split(/(?<=[.!?])\s+(?=[A-Z])/).map(s=>{const start=offset+s.indexOf(s.trim());offset+=s.length+1;return {text:s.trim(),start};});});
  // Re-find exact spans from the last consumed offset; sentence whitespace may be more than one character.
  let cursor=0;
  for(const segment of segments){const s=segment.text;if(!s)continue;const start=job.description.indexOf(s,cursor);cursor=start+s.length;if(start<0)continue;
    if(all.length>=200){limited=true;break;}
    const span:SourceSpan={field:'description',start,end:start+s.length,quote:s};
    if(s.length>2000){add('unresolved','Description segment exceeds safe interpretation limit','REQUIRED',{...span,end:start+2000,quote:s.slice(0,2000)});limited=true;continue;}
    if(/^(?:required skills|requirements|minimum qualifications|must have)\s*:?$/i.test(s)){section='REQUIRED';continue;}
    if(/^(?:preferred|nice to have|bonus|preferred qualifications)\s*:?$/i.test(s)){section='PREFERRED';continue;}
    if(/^(?:responsibilities|about us|benefits|projects|what you will do)\s*:?$/i.test(s)){section='UNSPECIFIED';continue;}
    const importance:Importance=/\b(?:not required|no .{0,20}required)\b/i.test(s)?'UNSPECIFIED':/\b(?:preferred|nice to have|bonus|a plus|optional)\b/i.test(s)?'PREFERRED':/\b(?:required|must|mandatory|minimum|at least|essential)\b/i.test(s)?'REQUIRED':section;
    if(/\b(?:required|must|mandatory|minimum|at least|essential)\b/i.test(s)&&/\b(?:preferred|nice to have|bonus|a plus|optional)\b/i.test(s)&&!/\bnot required\b/i.test(s))add('unresolved','Mixed mandatory and preferred conditions need clause review','REQUIRED',span);
    const qualificationNames=Object.keys(qualificationPatterns).filter(k=>qualificationPatterns[k].test(s));
    for(const q of qualificationNames){if(q==="Bachelor's degree"&&qualificationNames.includes("Bachelor's degree in Computer Science"))continue;add('qualification',q,importance,span);}
    const skills=technologies(s);
    const list=/^(?:(?:required|preferred|technical|essential)\s+)?(?:skills|technologies|stack)\s*:\s*(.+)/i.exec(s);
    if(list){let rest=list[1];for(const pattern of Object.values(skillPatterns))rest=rest.replace(new RegExp(pattern.source,'gi'),' ');rest=rest.replace(/\b(?:and|or|either|with|experience|skills|knowledge|of|in|using|a|an)\b/gi,' ').replace(/[\s,.;:/()&-]+/g,' ').trim();if(rest)add('unresolved','Unparsed skills/proficiency: '+rest,importance,span);}
    if(!qualificationNames.length){
      // Keep alternatives together only when the source literally says 'or'.
      const ordered=skills.map(k=>({k,index:s.search(skillPatterns[k]),length:s.match(skillPatterns[k])![0].length})).sort((a,b)=>a.index-b.index);
      const groups:string[][]=[];
      ordered.forEach((a,i)=>{const prev=ordered[i-1];if(prev&&/^\s+or\s+$/i.test(s.slice(prev.index+prev.length,a.index)))groups[groups.length-1].push(a.k);else groups.push([a.k]);});
      for(const group of groups){const existing=all.find(r=>r.kind==='skill'&&r.alternatives.join('|')===group.join('|'));if(existing){if(importance==='REQUIRED'&&existing.importance!=='REQUIRED'){existing.importance=importance;Object.assign(existing,span);}continue;}add('skill',group.join(' or '),importance,span,{alternatives:group});}
    }
    const years=/\b(\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:\+|[-–]\s*\d+)?\s*(?:years?|yrs?)\b/i.exec(s);
    if(years&&/\b(?:experience|hands[- ]on|professional|commercial|employment)\b/i.test(s)&&!/\b(?:years? old|our company|our team|we have|we bring)\b/i.test(s)){
      const words=['zero','one','two','three','four','five','six','seven','eight','nine','ten'];const number=Number.isNaN(Number(years[1]))?words.indexOf(years[1].toLowerCase()):Number(years[1]);
      if(number>=0&&number<=80)add('experience',s,importance==='PREFERRED'?'PREFERRED':'REQUIRED',span,{years:number,experienceKind:/\bcommercial|employment\b/i.test(s)?'commercial':/\bhands[- ]on|project\b/i.test(s)?'handsOn':'professional',alternatives:skills});
    }else if(/\bexperience\b/i.test(s)&&importance==='REQUIRED'&&!skills.length&&!years)add('unresolved','Unstructured mandatory experience condition',importance,span);
    for(const task of Object.keys(taskPatterns).filter(k=>taskPatterns[k].test(s))){const existing=all.find(r=>r.kind==='task'&&r.label===task);if(!existing)add('task',task,importance,span);else if(importance==='REQUIRED'){existing.importance='REQUIRED';Object.assign(existing,span);}}
    if(importance==='REQUIRED'&&(skills.length||years||qualificationNames.length||Object.values(taskPatterns).some(p=>p.test(s)))&&!list){
      let residual=s;for(const pattern of [...Object.values(qualificationPatterns),...Object.values(skillPatterns),...Object.values(taskPatterns)])residual=residual.replace(new RegExp(pattern.source,'gi'),' ');
      residual=residual.replace(/\b(?:\d+(?:\.\d+)?|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:\+|[-–]\s*\d+)?\s*(?:years?|yrs?)\b/gi,' ').replace(/\b(?:and|or|either|required|must|have|has|be|are|is|essential|mandatory|minimum|at|least|professional|commercial|employment|hands|on|skills|skill|knowledge|proficiency|proficient|experience|experienced|expertise|with|in|of|using|a|an|the|strong|good|solid|technical)\b/gi,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
      if(residual)add('unresolved','Unparsed mandatory context: '+residual,'REQUIRED',span);
    }
    if(importance==='REQUIRED'&&/\b(?:degree|certif\w*|license|licence|years? old)\b/i.test(s)&&!qualificationNames.length)add('unresolved','Unrecognized mandatory qualification',importance,span);
    if(importance==='REQUIRED'&&!skills.length&&!qualificationNames.length&&!years&&!Object.values(taskPatterns).some(p=>p.test(s))&&!list&&!/\b(?:authori[sz]|visa|citizen|residen|country|location|based|live|employment|full[- ]time|part[- ]time|contract|overlap|working hours|salary)\w*/i.test(s))add('unresolved','Unparsed mandatory condition',importance,span);
  }
  const level=seniorityLevel(job.seniority||job.title);let seniority:Requirement|null=null;
  if(level){const field=job.seniority&&seniorityLevel(job.seniority)?'seniority':'title';const value=String(job[field]);seniority=add('seniority',level,'UNSPECIFIED',{field,start:0,end:value.length,quote:value});}
  return {all,skills:all.filter(r=>r.kind==='skill'),experience:all.filter(r=>r.kind==='experience'&&!all.some(u=>u.kind==='unresolved'&&u.field===r.field&&u.start===r.start&&u.end===r.end)),tasks:all.filter(r=>r.kind==='task'),qualifications:all.filter(r=>r.kind==='qualification'),seniority,unresolved:all.filter(r=>r.kind==='unresolved'),limited};
}
