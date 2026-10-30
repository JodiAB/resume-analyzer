import {NetworkEvidence,observeXHR} from './network-evidence';
export function targetEndpoint(kind:string,url:URL):boolean {
 if(url.origin!=='https://api.puter.com')return false;
 return kind==='read'?url.pathname==='/read':kind==='delete'?url.pathname==='/delete':kind==='upload'?url.pathname==='/batch':['approve','approve-write','download','generate'].includes(kind)?url.pathname==='/drivers/call':false;
}
export function classifyNetworkOutcome(n:{overlap:boolean;pending:number},changed:boolean,accepted:boolean,sessionRejected:boolean){
 if(n.pending)return 'BLOCKED';
 if(!changed)return 'NOT TESTED';
 if(!n.overlap)return 'BLOCKED';
 return accepted?'FAIL':sessionRejected?'PASS':'BLOCKED';
}
const validRun=(run:string)=>/^[a-f0-9-]{36}$/.test(run);
export function syntheticTransferFile(run:string):File {
 if(!validRun(run))throw new Error('Invalid synthetic run');
 const bytes=new Uint8Array(2*1024*1024);bytes.set(new TextEncoder().encode('SYNTHETIC NETWORK '+run+'\n'));
 return new File([bytes],'network-'+run+'.bin',{type:'application/octet-stream'});
}
export async function validSyntheticTransfer(blob:Blob,run:string):Promise<boolean>{
 if(!validRun(run)||blob.size!==2*1024*1024)return false;
 const expected=new Uint8Array(await syntheticTransferFile(run).arrayBuffer()),actual=new Uint8Array(await blob.arrayBuffer());
 return actual.every((v,i)=>v===expected[i]);
}
// Observes only the SDK call selected by the harness, never auth/preflight calls.
// Its observer remains installed until explicit finish; admission closes at SDK settlement.
export function instrumentTarget(target:Window & typeof globalThis,sdk:any,kind:string,onTransfer:()=>void){
 const evidence=new NetworkEvidence();let active=false,dispatched=false,settled=false;
 const stop=observeXHR(target,u=>active&&targetEndpoint(kind,u),evidence,onTransfer);
 const area=['read','upload','delete'].includes(kind)?'fs':'kv';
 const method=['read','upload','delete'].includes(kind)?kind:kind==='approve-write'?'set':'list';
 const original=sdk[area][method];
 const wrapped=function(this:unknown,...args:any[]){
  // Restore synchronously: exactly one target call is admitted.
  sdk[area][method]=original;dispatched=true;active=true;
  if(kind==='upload')args[2]={...args[2],init:(id:unknown,xhr:XMLHttpRequest)=>{stop.include(xhr);}};
  let result;try{result=original.apply(this,args);}catch(error){active=false;settled=true;throw error;}
  return Promise.resolve(result).finally(()=>{active=false;settled=true;});
 };
 sdk[area][method]=wrapped;
 return {evidence,state:()=>({dispatched,settled}),stop:()=>{active=false;if(sdk[area][method]===wrapped)sdk[area][method]=original;stop();}};
}
