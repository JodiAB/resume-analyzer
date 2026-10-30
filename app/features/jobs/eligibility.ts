import type { Job, JobStatus } from './model';
import type { SearchPreferences } from './preferences';
export interface Evaluation { status: JobStatus; saEligibility: 'ELIGIBLE' | 'INELIGIBLE' | 'UNKNOWN'; reasons: string[]; evidence: string[] }
export function authorizationMatches(line:string,country:string):boolean {
  const jurisdiction=/\b(?:work in|work authori[sz]ation (?:in|for)|work permit (?:in|for)|right to work in)\s+(?:the\s+)?([^.!?\n]{1,150})/i.exec(line)?.[1];if(!jurisdiction)return false;
  const groups=[['US','USA','United States'],['UK','United Kingdom'],['South Africa','ZA'],['EU','European Union']];const aliases=groups.find(g=>g.some(a=>a.toLowerCase()===country.trim().toLowerCase()))||[country.trim()];
  return aliases.some(a=>new RegExp(`(?:^|[^a-z])${a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:$|[^a-z])`,'i').test(jurisdiction));
}
export function evaluateJob(j: Job, p: SearchPreferences, now: string): Evaluation {
  const reasons: string[] = []; const evidence: string[] = [];
  const lines = `${j.locations.join('\n')}\n${j.description}`.split(/[\n.!?]+/).map(s => s.trim()).filter(Boolean);
  const exclusion = lines.find(s => /\b(?:do not|don't|cannot|not currently|not)\s+(?:hire|hiring|accept|recruit|available)(?:\s+\w+){0,5}\s+South Africa\b|\b(?:excluding|except|exclude)\s+South Africa\b/i.test(s) && !/\boutside\s+South Africa\b|\bnot\s+(?:excluding|excluded)\b/i.test(s));
  const restrictionLines = `${j.locations.join('\n')}\n${j.description}`.split(/\n/).map(s=>s.trim()).filter(s=>! /^(?:Pension|Health insurance|Classpass|Dental insurance|Retirement benefit)\b/i.test(s));
  const restricted = restrictionLines.find(s => /\b(?:US|USA|United States|UK|United Kingdom|EU|EEA|Europe|Canada|Australia|Germany|France|Netherlands|Spain|Portugal|India|Brazil|Poland)[ -]+only\b|\bmust be based in (?:the )?(?:United States|United Kingdom|US|UK|Canada|Australia|EU|EEA|Germany|France|Netherlands|Spain|Portugal|India|Brazil|Poland)\b/i.test(s) && !/\b(?:not|no|without)\b/i.test(s));
  const allowed = lines.find(s => /\b(?:hire|hiring|open to|accept|eligible|available)(?:\s+[a-z-]+){0,6}\s+South Africa\b/i.test(s) && !/\b(?:not|no|except|exclud\w*|outside|cannot|don't)\b/i.test(s));
  // Only an explicit hiring location or a mandatory permitted-country list is positive evidence.
  // Customer markets, offices, worldwide and broad regions remain UNKNOWN.
  const outsideSA = lines.find(l => /\b(?:hir\w*|recruit\w*|open to|available)\b.{0,80}\boutside South Africa\b/i.test(l));
  if (outsideSA) { reasons.push('Hiring outside South Africa is mentioned; conflicting geographic scope needs manual review.'); evidence.push(outsideSA); }
  const saLocation = j.locations.find(l => /^(?:remote\s*[-,:]\s*)?South Africa$/i.test(l.trim()));
  const countryChoices = lines.find(l => /\b(?:candidates|applicants) must be (?:legally )?authori[sz]ed to work in one of the following countries:/i.test(l) && /\bSouth Africa\b/i.test(l) && !/\b(?:not|except|excluding)\b/i.test(l));
  const remoteHiringLocation = lines.find(l => /^(?:Working location:\s*)?Based in (?:Europe or )?South Africa,\s*and hired remotely\b/i.test(l));
  let saEligibility: Evaluation['saEligibility'] = exclusion || restricted ? 'INELIGIBLE' : !outsideSA && (allowed || saLocation || countryChoices || remoteHiringLocation) ? 'ELIGIBLE' : 'UNKNOWN';
  if (saLocation || countryChoices || remoteHiringLocation) evidence.push((saLocation || countryChoices || remoteHiringLocation)!);
  if (saEligibility === 'UNKNOWN' && j.locations.length) {
    reasons.push('Advertised location is not confirmed South Africa hiring permission; review the original location restrictions.');
    evidence.push(...j.locations);
  }
  if (exclusion || restricted || allowed) evidence.push((exclusion || restricted || allowed)!);
  let incompatible = saEligibility === 'INELIGIBLE' && /South Africa/i.test(p.country);
  if (incompatible) reasons.push('Explicit restriction excludes a South Africa-based applicant.');
  const auth = lines.find(s => /\b(?:must|required to) be (?:legally )?(?:authori[sz]ed|eligible) to work in\b/i.test(s));
  if (auth) {
    evidence.push(auth);
    if (!countryChoices && p.lacksAuthorization.some(country => authorizationMatches(auth,country))) { incompatible = true; reasons.push('Required work authorization is explicitly declared unavailable by you.'); }
    else reasons.push('Required work authorization is unresolved; no authorization was inferred.');
  }
  const otherAuthorization=lines.find(s=>/\b(?:citizenship|citizens?|visas?|work permits?|work authori[sz]ation|sponsor\w*|right to work)\b/i.test(s));
  if(otherAuthorization&&!auth){reasons.push('Citizenship, visa or sponsorship conditions need manual review.');evidence.push(otherAuthorization);}
  const locationCondition=lines.find(s=>/\b(?:must|required?|only|restricted)\b.{0,100}\b(?:based|residents?|residency|residence|resid[ei]\w*|citizens?|country|located|location|live|living)\b|\b(?:based|residents?|residency|residence|resid[ei]\w*|citizens?|country|located|location|live|living)\b.{0,100}\b(?:must|required?|only|restricted)\b/i.test(s));
  if(locationCondition&&!incompatible){reasons.push('A mandatory residence or location condition requires manual verification.');evidence.push(locationCondition);}
  if(!/South Africa/i.test(p.country))reasons.push('Automatic eligibility verification currently covers South Africa only; review the selected country manually.');
  const foreignOnsite = j.remote === 'ONSITE' && /South Africa/i.test(p.country) && j.locations.some(l => /\b(?:United States|United Kingdom|USA|Canada|Australia|Germany|France|London)\b/i.test(l)) && !j.locations.some(l => /South Africa/i.test(l));
  if (foreignOnsite) { incompatible = true; reasons.push('On-site-only role outside the stated country.'); evidence.push(j.locations.join('; ')); }
  const closed = j.availability === 'CLOSED' || !!(j.deadline && Date.parse(j.deadline) < Date.parse(now));
  if (closed) return { status: 'EXPIRED', saEligibility, reasons: ['Posting confirmed closed or application deadline passed.', ...reasons], evidence };
  if (incompatible) return { status: 'INELIGIBLE', saEligibility, reasons, evidence };
  if (j.checkError) return { status: 'SOURCE_ERROR', saEligibility, reasons: ['Recheck failed; the previous snapshot is retained. Availability was not inferred.'], evidence };
  const age = j.publishedAt ? Date.parse(now) - Date.parse(j.publishedAt) : NaN;
  if (!Number.isFinite(age) || age < 0) reasons.push('Publication date is missing or in the future; updated time is not a publication date.');
  else if (age > p.days * 86400000) reasons.push('Published outside the selected discovery window.');
  if (saEligibility === 'UNKNOWN') reasons.push('South African eligibility is UNKNOWN; remote or worldwide alone is insufficient.');
  if (j.remote !== 'REMOTE') reasons.push('Fully remote work is not established.');
  if (j.availability !== 'OPEN') reasons.push('Application availability is UNKNOWN.');
  if (j.source === 'manual') reasons.push('Manual information has not been verified with a permitted source.');
  return { status: reasons.length ? 'UNVERIFIED' : 'VERIFIED', saEligibility, reasons: reasons.length ? reasons : ['Current public listing, recent documented publication and explicit SA remote eligibility. Salary is optional.'], evidence };
}
