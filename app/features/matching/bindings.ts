import {sha256,verifySource} from '../profile/extract';
import {validateProfile,type ProfileRevision} from '../profile/schema';
import {validateJob,type Job} from '../jobs/model';
import {validateMatchConfig} from './engine';
import type {MatchConfig} from './types';
import type {SemanticPayload} from './semantic';
import {defaultSearchPreferences,validateSearchPreferences,type SearchPreferences} from '../jobs/preferences';
export interface Bindings {profileId:string;profileHash:string;jobKey:string;jobHash:string;configHash:string;preferencesHash:string}
export interface MatchRecord extends Bindings {schemaVersion:1;id:string;ownerId:string;config:MatchConfig;analyzedAt:string;semantic:SemanticPayload|null;mode:'deterministic'|'puter-ai';model:'grok-3'|null}
function canonical(v:unknown):unknown {if(Array.isArray(v))return v.map(canonical);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)]));return v;}
export const fingerprint=(v:unknown)=>sha256(new TextEncoder().encode(JSON.stringify(canonical(v))));
export async function makeBindings(rawProfile:ProfileRevision,rawJob:Job,rawConfig:MatchConfig,rawPreferences:SearchPreferences=defaultSearchPreferences()):Promise<Bindings>{
  const profile=validateProfile(rawProfile),job=validateJob(rawJob),config=validateMatchConfig(rawConfig);await verifySource(profile.source);
  const [profileHash,jobHash,configHash,preferencesHash]=await Promise.all([fingerprint(profile),fingerprint(job),fingerprint(config),fingerprint(validateSearchPreferences(rawPreferences))]);
  return {profileId:profile.id,profileHash,jobKey:job.key,jobHash,configHash,preferencesHash};
}
export const sameBindings=(a:Bindings,b:Bindings)=>a.profileId===b.profileId&&a.profileHash===b.profileHash&&a.jobKey===b.jobKey&&a.jobHash===b.jobHash&&a.configHash===b.configHash&&a.preferencesHash===b.preferencesHash;
