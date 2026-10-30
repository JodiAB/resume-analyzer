// Synthetic A-only upload/delete markers; no file contents in diagnostic output.
export function auditAuxiliaryFiles(raw:unknown,alias:string,run:string){
 let recognizedSyntheticFiles=0,unverifiedEntries=0;
 if(!Array.isArray(raw)||raw.length>100||!['A','B'].includes(alias)||!/^[a-f0-9-]{36}$/.test(run))return {status:'BLOCKED',recognizedSyntheticFiles,unverifiedEntries:1,unexpectedAUploadInB:false};
 for(const item of raw){if(item&&typeof item.text==='string'&&['SYNTHETIC RACE '+run,'SYNTHETIC DELETE '+run].includes(item.text))recognizedSyntheticFiles++;else unverifiedEntries++;}
 const unexpectedAUploadInB=alias==='B'&&recognizedSyntheticFiles>0;
 return {status:unexpectedAUploadInB?'FAIL':unverifiedEntries?'BLOCKED':'PASS',recognizedSyntheticFiles,unverifiedEntries,unexpectedAUploadInB};
}
