// Disposable synthetic run recovery. Not imported by production routes.
import {validId} from '../app/features/profile/schema';
interface Row {key:string;value:string}
interface Dependencies {ownerId:string;assertSession:()=>void;list:()=>Promise<unknown>;validateStores:()=>Promise<void>;expectedFileHash:string;fileHash:(path:string)=>Promise<string|null>;get:(key:string)=>Promise<string|null|undefined>;deleteKey:(key:string)=>Promise<unknown>;deleteFile:(path:string)=>Promise<unknown>}
interface Manifest {ownerId:string;run:string;alias:string;entries:Row[];filePath:string;fileHash:string}
export async function recoverReleaseTargets(run:string,alias:string,d:Dependencies):Promise<Manifest>{
 d.assertSession();if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(run)||!['A','B'].includes(alias)||!validId(d.ownerId))throw new Error('Invalid recovery identity');
 const raw=await d.list();d.assertSession();if(!Array.isArray(raw)||raw.length>100)throw new Error('Unconfirmed recovery listing');const counts=new Set<string>(),entries:Row[]=[];
 for(const row of raw){if(!row||typeof row.key!=='string'||typeof row.value!=='string'||row.value.length>2000000)throw new Error('Invalid recovery entry');const match=/^jp:v1:(profile|jobs|match|prep|applications):([a-zA-Z0-9-]{1,100}):([a-zA-Z0-9-]{1,100})$/.exec(row.key),v=JSON.parse(row.value);if(!match||match[2]!==d.ownerId||v?.ownerId!==d.ownerId||v.id!==match[3])throw new Error('Foreign or ambiguous record; no cleanup');if(match[1]==='applications'?v.applicationId!==`m6-${run}-app`:!v.id.startsWith(`m6-${run}-`))throw new Error('Other history exists; no cleanup');counts.add(match[1]);entries.push({key:row.key,value:row.value});}
 if(counts.size!==5||new Set(entries.map(e=>e.key)).size!==entries.length)throw new Error('Incomplete recovery scope');await d.validateStores();d.assertSession();const filePath=`jobpilot/resumes/m6-${run}-${alias}/release-${alias}.pdf`,hash=await d.fileHash(filePath);d.assertSession();if(!hash||hash!==d.expectedFileHash)throw new Error('Original synthetic alias PDF not confirmed');return {ownerId:d.ownerId,run,alias,entries,filePath,fileHash:hash};
}
export async function cleanRecoveredTargets(m:Manifest,d:Dependencies){
 d.assertSession();if(m.ownerId!==d.ownerId)throw new Error('Recovery owner changed');
 // Preflight all captured targets before any deletion. Only this in-memory
 // manifest permits absence on retry after an interrupted cleanup.
 for(const e of m.entries){const current=await d.get(e.key);d.assertSession();if(current!==null&&current!==e.value)throw new Error('Synthetic record changed; cleanup stopped');}
 const hash=await d.fileHash(m.filePath);d.assertSession();if(hash!==null&&hash!==m.fileHash)throw new Error('Synthetic PDF changed; cleanup stopped');
 if(hash!==null){await d.deleteFile(m.filePath);d.assertSession();if(await d.fileHash(m.filePath)!==null)throw new Error('File deletion unconfirmed');d.assertSession();}
 for(const e of [...m.entries].reverse()){const current=await d.get(e.key);d.assertSession();if(current===null)continue;if(current!==e.value)throw new Error('Synthetic record changed; cleanup stopped');await d.deleteKey(e.key);d.assertSession();if(await d.get(e.key)!==null)throw new Error('Key deletion unconfirmed');d.assertSession();}
 for(const e of m.entries){if(await d.get(e.key)!==null)throw new Error('Cleanup absence unconfirmed');d.assertSession();}
 if(await d.fileHash(m.filePath)!==null)throw new Error('Cleanup file absence unconfirmed');d.assertSession();return {keysConfirmedAbsent:m.entries.length,originalPdfConfirmedAbsent:true};
}
