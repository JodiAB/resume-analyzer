import { validFilePath } from '../app/lib/validation';
import { RecoveryError } from './recover-fixture';
interface AuxiliaryIO {
  assertSession:()=>void;
  get:(key:string)=>Promise<string|null|undefined>;
  getRoot:()=>Promise<string>;
  list:(path:string)=>Promise<unknown>;
  read:(path:string)=>Promise<Blob|undefined>;
  deleteFile:(path:string)=>Promise<unknown>;
  sha:(blob:Blob)=>Promise<string>;
}
export async function cleanupAuxiliaryFixtures(run:string,io:AuxiliaryIO){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(run))throw new RecoveryError('INVALID_RUN');
  io.assertSession();
  if(await io.get(`jobpilot-gate:${run}:A`)!==`SYNTHETIC-A-${run}`)throw new RecoveryError('A_KEY_NOT_FOUND');
  io.assertSession();
  const root=(await io.getRoot()).replace(/\/$/,'');io.assertSession();
  if(!validFilePath(root)||!/^\/[^/]+\/AppData\/[^/]+$/.test(root))throw new RecoveryError('A_ROOT_UNCONFIRMED');
  const directory=`${root}/jobpilot/resumes/gate-${run}-aux`;
  const list=async():Promise<Array<{name:string}>>=>{
    io.assertSession();
    let value:unknown;
    try{value=await io.list(directory);}catch(error){
      io.assertSession();
      if(error&&typeof error==='object'&&'code'in error&&['subject_does_not_exist','not_found'].includes(String(error.code)))return [];
      throw new RecoveryError('AUX_LIST_UNCONFIRMED');
    }
    io.assertSession();
    if(!Array.isArray(value)||value.length>50)throw new RecoveryError('AUX_LIST_UNCONFIRMED');
    for(const item of value){
      if(!item||typeof item!=='object'||typeof item.name!=='string'||!/^(?:aux|delete-aux)(?: ?\(\d+\))?\.txt$/.test(item.name)||item.is_dir===true||item.isDir===true)throw new RecoveryError('AUX_UNEXPECTED_CONTENT');
    }
    return value;
  };
  const entries=await list();
  const paths:string[]=[];
  // Verify all content before deleting any item. Never delete unknown files or
  // recurse into directories, even inside this dedicated synthetic test folder.
  for(const entry of entries){
    io.assertSession();const path=directory+'/'+entry.name;
    let blob:Blob|undefined;
    try{blob=await io.read(path);}catch{io.assertSession();throw new RecoveryError('AUX_READ_UNCONFIRMED');}
    io.assertSession();
    const expected=new Blob([(entry.name.startsWith('delete-aux')?'SYNTHETIC DELETE AUX ':'SYNTHETIC AUX ')+run]);
    if(!blob||await io.sha(blob)!==await io.sha(expected))throw new RecoveryError('AUX_CONTENT_MISMATCH');
    io.assertSession();paths.push(path);
  }
  let ambiguousReceipts=0;
  for(const path of new Set(paths)){
    io.assertSession();
    try{await io.deleteFile(path);}catch{
      io.assertSession();ambiguousReceipts++;
      if((await list()).some(item=>directory+'/'+item.name===path))throw new RecoveryError('AUX_DELETE_UNCONFIRMED');
    }
    io.assertSession();
  }
  if((await list()).length)throw new RecoveryError('AUX_DELETE_UNCONFIRMED');
  io.assertSession();
  return {directory,deleted:paths.length,ambiguousReceipts};
}
