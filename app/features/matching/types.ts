export const categories=['skills','experience','projects','seniority','responsibilities','secondary'] as const;
export type Category=typeof categories[number];
export type Importance='REQUIRED'|'PREFERRED'|'UNSPECIFIED';
export type EvidenceStatus='SUPPORTED'|'TRANSFERABLE'|'NOT_DOCUMENTED'|'GAP'|'PARTIAL';
export interface SourceSpan {field:'description'|'title'|'seniority';start:number;end:number;quote:string}
export interface Requirement extends SourceSpan {id:string;kind:'skill'|'experience'|'task'|'qualification'|'seniority'|'unresolved';label:string;importance:Importance;alternatives:string[];years:number|null;experienceKind:'commercial'|'professional'|'handsOn'|null}
export interface Requirements {all:Requirement[];skills:Requirement[];experience:Requirement[];tasks:Requirement[];qualifications:Requirement[];seniority:Requirement|null;unresolved:Requirement[];limited:boolean}
export interface MatchConfig {
  version:'jp-match-v1';weights:Record<Category,number>;thresholds:{excellent:number;strong:number;potential:number};
  declaredGaps:string[];confirmedAuthorizations:string[];completeCommercialHistory:boolean;allowedEmploymentTypes:string[];
  salaryTarget:number;salaryCurrency:string;salaryPeriod:'hour'|'month'|'year';salaryMandatory:boolean;
  candidateTimeZone:string;workingStart:string;workingEnd:string;minimumOverlapHours:number;hoursMandatory:boolean;
}
export interface GateCheck {name:string;status:'PASS'|'FAIL'|'UNKNOWN';reason:string;requirementIds:string[];claimIds:string[];declaration:string|null}
export interface MatchGap {requirementId:string;label:string;importance:Importance;status:EvidenceStatus;claimIds:string[];explanation:string}
export interface Component {key:Category;maximum:number;points:number;coverage:number;explanation:string;claimIds:string[];requirementIds:string[]}
export interface Constraint {status:'COMPATIBLE'|'CONFLICT'|'UNKNOWN';mandatory:boolean;explanation:string}
export interface Assessment {score:number;band:string;confidence:'HIGH'|'MEDIUM'|'LOW';coverage:number;eligibility:'ELIGIBLE'|'INELIGIBLE'|'UNKNOWN';recommendation:'RECOMMENDED'|'MANUAL_REVIEW'|'BLOCKED'|'LOWER_PRIORITY';gates:GateCheck[];components:Component[];gaps:MatchGap[];strengths:MatchGap[];requirements:Requirements;constraints:{salary:Constraint;hours:Constraint};warnings:string[];asOf:string}
