import {validateProfile,type ProfileRevision,type Claim} from '../profile/schema';
import {technologies,negatedEvidence} from './requirements';
export interface Duration {minMonths:number;maxMonths:number|null;claimIds:string[];uncertain:boolean}
export const confirmedClaims=(profile:ProfileRevision)=>profile.claims.filter(c=>c.basis==='cv'&&!!c.confirmedAt);
export const isVerifiedPaidFreelance=(c:Claim)=>c.kind==='freelance'&&!/\b(?:no|not|never|without|unpaid|uncompensated)\b/i.test(c.evidence?.quote||c.values.label)&&(/\bpaid\s+freelance\b/i.test(c.values.label)||/\bfreelance\b[^.;\n]{0,40}\b(?:was|is|were)\s+paid\b/i.test(c.values.label));
function bounds(value:string,end:boolean,now:number):[number,number]|null {
  if(value==='present'&&end)return [now,now];if(!value)return null;
  const [year,month,day]=value.split('-').map(Number);
  const low=Date.UTC(year,(month||1)-1,day||1)+(end?86400000:0);
  const high=Date.UTC(year,(month||12)-1,day||new Date(Date.UTC(year,month||12,0)).getUTCDate())+(end?86400000:0);
  return [Math.min(low,now),Math.min(high,now)];
}
function duration(claims:Claim[],asOf:string):Duration {
  const now=Date.parse(asOf);const low:[number,number][]=[];const high:[number,number][]=[];let uncertain=false;let openUpper=false;
  for(const c of claims){const a=bounds(c.values.start,false,now),b=bounds(c.values.end,true,now);if(!a||!b){uncertain=true;openUpper=true;continue;}if(a[0]!==a[1]||b[0]!==b[1])uncertain=true;if(b[0]>a[1])low.push([a[1],b[0]]);if(b[1]>a[0])high.push([a[0],b[1]]);}
  const count=(intervals:[number,number][],whole:boolean)=>{
    if(!intervals.length)return 0;
    const union:[number,number][]=[];for(const i of intervals.sort((a,b)=>a[0]-b[0])){const last=union.at(-1);if(last&&i[0]<=last[1])last[1]=Math.max(last[1],i[1]);else union.push([...i]);}
    const first=new Date(union[0][0]);let month=Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),1);const end=union.at(-1)![1];let total=0;
    while(month<end){const d=new Date(month);const next=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1);if(union.some(([a,b])=>whole?a<=month&&b>=next:a<next&&b>month))total++;month=next;}return total;
  };
  return {minMonths:count(low,true),maxMonths:openUpper?null:count(high,false),claimIds:claims.map(c=>c.id),uncertain};
}
export function experienceSummary(input:ProfileRevision,asOf:string,topics:string[]=[]){
  const profile=validateProfile(input);const claims=confirmedClaims(profile).filter(c=>['employment','freelance','project'].includes(c.kind)&&(!topics.length||technologies(c.values.label).some(t=>topics.includes(t)&&!negatedEvidence(c,t))));
  const commercial=claims.filter(c=>c.kind==='employment'&&!/\b(?:unpaid|volunteer|personal project)\b/i.test(c.values.label));
  const freelance=claims.filter(c=>c.kind==='freelance');const paid=freelance.filter(isVerifiedPaidFreelance);
  return {commercial:duration(commercial,asOf),paidFreelance:duration(paid,asOf),professional:duration([...commercial,...paid],asOf),handsOn:duration(claims,asOf),unverifiedFreelancePay:freelance.filter(c=>!paid.includes(c)).map(c=>c.id)};
}
