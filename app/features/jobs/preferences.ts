import type { Preferences } from '../profile/schema';
import { evaluateJob } from './eligibility';
import { isObject, text, type Job } from './model';
export interface SearchPreferences {
  titles: string[]; locations: string[]; locationQuery: string; country: string; timeZone: string; overlapZones: string[]; hoursQuery: string; filterOverlap: boolean;
  days: number; fullTimeTarget: number; partTimeTarget: number; salaryCurrency: string; salaryPeriod: 'month' | 'year' | 'hour';
  remoteOnly: boolean; internationalOnly: boolean; includeUnknownDates: boolean; hideBelowSalary: boolean; showIneligible: boolean; search: string; lacksAuthorization: string[];
}
export const defaultSearchPreferences = (): SearchPreferences => ({ titles: ['Full Stack Developer','Frontend Developer','React Developer','Next.js Developer','Software Engineer','AI Application Developer'], locations: ['South Africa', 'Remote'], locationQuery:'', country: 'South Africa', timeZone: 'Africa/Johannesburg', overlapZones: ['Europe/London','Europe/Berlin','America/New_York'], hoursQuery: '', filterOverlap:false, days: 7, fullTimeTarget: 3000, partTimeTarget: 1500, salaryCurrency: 'USD', salaryPeriod: 'month', remoteOnly: true, internationalOnly: true, includeUnknownDates: true, hideBelowSalary: false, showIneligible: false, search: '', lacksAuthorization: [] });
export function preferencesFromProfile(p: Preferences | null): SearchPreferences {
  const d = defaultSearchPreferences(); if (!p) return d;
  return { ...d, titles: p.titles.length ? p.titles : d.titles, locations: p.locations.length ? p.locations : d.locations, timeZone: p.timeZone || d.timeZone, overlapZones: p.overlapZones.length ? p.overlapZones : d.overlapZones, ...(p.salary ? { fullTimeTarget: p.salary.min, partTimeTarget: p.salary.currency==='USD'&&p.salary.period==='month'?d.partTimeTarget:0, salaryCurrency: p.salary.currency, salaryPeriod: p.salary.period } : {}) };
}
export function validateSearchPreferences(v: unknown): SearchPreferences {
  const d = defaultSearchPreferences();
  if (!isObject(v) || Object.keys(v).length !== Object.keys(d).length || Object.keys(d).some(k => !(k in v))) throw new Error('Invalid search preferences');
  for (const k of ['titles','locations','overlapZones','lacksAuthorization']) if (!Array.isArray(v[k]) || v[k].length > 30 || !v[k].every(s => text(s, 200) && s.trim())) throw new Error('Invalid preference list');
  for (const k of ['country','timeZone','hoursQuery','search','locationQuery']) if (!text(v[k], 500)) throw new Error('Invalid preference text');
  if (!(v.country as string).trim() || !Number.isInteger(v.days) || (v.days as number) < 1 || (v.days as number) > 30) throw new Error('Invalid discovery window');
  for (const k of ['fullTimeTarget','partTimeTarget']) if (typeof v[k] !== 'number' || !Number.isFinite(v[k]) || v[k] < 0 || v[k] > 1e12) throw new Error('Invalid salary target');
  if (typeof v.salaryCurrency !== 'string' || !/^[A-Z]{3}$/.test(v.salaryCurrency) || !['hour','month','year'].includes(v.salaryPeriod as string)) throw new Error('Invalid salary preferences');
  for (const k of ['remoteOnly','internationalOnly','includeUnknownDates','hideBelowSalary','showIneligible','filterOverlap']) if (typeof v[k] !== 'boolean') throw new Error('Invalid filter');
  for (const zone of [v.timeZone, ...(v.overlapZones as string[])].filter(Boolean)) { try { new Intl.DateTimeFormat('en', { timeZone: zone as string }); } catch { throw new Error('Invalid IANA time zone'); } }
  return structuredClone(v) as unknown as SearchPreferences;
}
const normalize = (s: string) => s.toLowerCase().replace(/[-_]/g, ' ').replace(/\bdeveloper\b/g,'engineer').replace(/\bfront end\b/g,'frontend').replace(/\bfullstack\b/g,'full stack').replace(/\s+/g, ' ').trim();
const zoneHints:Record<string,RegExp>={'Europe/London':/\b(?:UK|United Kingdom|London|GMT|BST)\b/i,'Europe/Berlin':/\b(?:Europe|Berlin|CET|CEST)\b/i,'America/New_York':/\b(?:US Eastern|Eastern time|EST|EDT)\b/i,'America/Los_Angeles':/\b(?:US Pacific|Pacific time|PST|PDT)\b/i,'Asia/Tokyo':/\b(?:Tokyo|Japan|JST)\b/i,'Africa/Johannesburg':/\b(?:South Africa|Johannesburg|SAST)\b/i};
function salaryBelow(j: Job, p: SearchPreferences): boolean {
  const target = /part.?time/i.test(j.employmentType || '') ? p.partTimeTarget : p.fullTimeTarget;
  const comparable = j.salary.flatMap(s => {
    if (s.currency !== p.salaryCurrency || s.period === 'unknown') return [];
    if (s.period === p.salaryPeriod) return [s.max];
    if (s.period === 'year' && p.salaryPeriod === 'month') return [s.max / 12];
    if (s.period === 'month' && p.salaryPeriod === 'year') return [s.max * 12];
    return [];
  });
  return comparable.length > 0 && comparable.every(max => max < target);
}
export function filterJobs(jobs: Job[], p: SearchPreferences, now: string): Job[] {
  return jobs.filter(j => {
    const e = evaluateJob(j, p, now);
    if (!p.showIneligible && ['INELIGIBLE','EXPIRED'].includes(e.status)) return false;
    const age = j.publishedAt ? Date.parse(now) - Date.parse(j.publishedAt) : NaN;
    if (Number.isFinite(age) && age >= 0 && age > p.days * 86400000) return false;
    if ((!Number.isFinite(age) || age < 0) && !p.includeUnknownDates) return false;
    const unclassifiedManual=j.source==='manual'&&j.title==='Imported vacancy (unverified)';
    if (!unclassifiedManual && p.titles.length && !p.titles.some(t => normalize(j.title).includes(normalize(t)))) return false;
    if (p.search && !normalize(`${j.title} ${j.employer} ${j.description}`).includes(normalize(p.search))) return false;
    if(p.locationQuery&&j.locations.some(l=>!/^remote$/i.test(l))&&!j.locations.some(l=>normalize(l).includes(normalize(p.locationQuery))))return false;
    if (p.remoteOnly && ['ONSITE','HYBRID'].includes(j.remote) && !p.showIneligible) return false;
    if (p.internationalOnly && j.employerCountry && normalize(j.employerCountry) === normalize(p.country)) return false;
    if (p.hoursQuery && /\b(?:UTC|GMT|CET|EST|EDT|time ?zone|overlap|working hours)\b/i.test(j.description) && !normalize(j.description).includes(normalize(p.hoursQuery))) return false;
    if(p.filterOverlap&&p.overlapZones.length){const lines=j.description.split(/[\n.!?]+/).filter(l=>/\b(?:hours|overlap|time ?zones?)\b/i.test(l)).join('\n');const mentioned=Object.keys(zoneHints).filter(z=>zoneHints[z].test(lines));if(mentioned.length&&!p.overlapZones.some(z=>mentioned.includes(z)))return false;}
    return !p.hideBelowSalary || !salaryBelow(j, p);
  });
}
