import type { ProfileRevision, Claim } from '../../app/features/profile/schema';
import type { Job } from '../../app/features/jobs/model';
export const asOf='2026-10-28T12:00:00.000Z';
export const profileFixture=():ProfileRevision=>{
  const rows=[
    ['employment','Senior React developer 2020-01-01 to 2024-12-31','2020-01-01','2024-12-31'],
    ['freelance','Paid freelance React developer 2021-01-01 to 2022-12-31','2021-01-01','2022-12-31'],
    ['project','React TypeScript accessible interfaces project 2023-01-01 to 2025-12-31','2023-01-01','2025-12-31'],
    ['skill','React','',''],['skill','TypeScript','',''],['certification','AWS Certified Developer','',''],
  ];let offset=0;const text=rows.map(r=>r[1]).join('\n');
  const claims:Claim[]=rows.map((r,i)=>{const start=offset;offset+=r[1].length+1;return {id:`claim-${i}`,kind:r[0] as Claim['kind'],values:{label:r[1],organization:'',start:r[2],end:r[3],proficiency:'',url:''},evidence:{page:1,start,end:start+r[1].length,quote:r[1]},correctionReason:'',basis:'cv',confirmedAt:asOf};});
  return {schemaVersion:1,id:'profile-1',ownerId:'a',parentId:null,createdAt:asOf,source:{fileName:'synthetic.pdf',fileHash:'a'.repeat(64),textHash:'b'.repeat(64),pages:[{page:1,text}]},claims,preferences:{titles:['Frontend Developer'],locations:['South Africa'],salary:null,timeZone:'Africa/Johannesburg',overlapZones:['Europe/London'],hoursPerWeek:40,workingHours:'09:00-17:00'}};
};
export const jobFixture=():Job=>({key:'ashby:Ashby:match-job',source:'ashby',board:'Ashby',sourceId:'match-job',employer:'Synthetic employer',employerCountry:null,title:'Senior Frontend Developer',url:'https://jobs.ashbyhq.com/Ashby/match-job',description:'We hire remote employees in South Africa.\nNo work authorization restrictions apply for this role.\nEmployment type: Full-time.\nRequired skills: React and TypeScript.\nMinimum 2 years of professional experience with React.\nResponsibilities: Build accessible interfaces.\nPortfolio projects using React and TypeScript preferred.\nPreferred qualification: AWS Certified Developer.',locations:['South Africa'],remote:'REMOTE',employmentType:'FullTime',seniority:'Senior',skills:['React','TypeScript'],salary:[],salaryNotes:'',publishedAt:'2026-10-27T12:00:00.000Z',publicationKind:'LAST_PUBLISHED',updatedAt:null,deadline:null,checkedAt:asOf,availability:'OPEN',checkError:null});
