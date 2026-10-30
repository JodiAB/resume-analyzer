// Counts/timing only. Never captures URLs, headers, bodies, keys or identities.
export class NetworkEvidence {
 private requests=new Map<number,{start:number;bytes:number|null;end:number|null}>();
 private change:number|null=null;
 start(id:number,at:number){if(!this.requests.has(id))this.requests.set(id,{start:at,bytes:null,end:null});}
 progress(id:number,at:number,loaded:number){const r=this.requests.get(id);if(r&&r.end===null&&loaded>0&&at>=r.start&&r.bytes===null)r.bytes=at;}
 end(id:number,at:number){const r=this.requests.get(id);if(r&&r.end===null&&at>=r.start)r.end=at;}
 changed(at:number){if(this.change===null)this.change=at;}
 summary(){const records=[...this.requests.values()];return {requests:records.length,transfers:records.filter(r=>r.bytes!==null).length,overlap:records.some(r=>this.change!==null&&r.bytes!==null&&r.bytes<this.change&&(r.end===null||this.change<r.end)),pending:records.filter(r=>r.end===null).length};}
}
// Install before loading the SDK. Admission is an exact origin/path predicate owned
// by the caller, never a private body inspector. Auth and unrelated traffic must be excluded.
export function observeXHR(target:Window & typeof globalThis,admit:(url:URL)=>boolean,evidence:NetworkEvidence,onTransfer:()=>void=()=>{}){
 const proto=target.XMLHttpRequest.prototype,open=proto.open,send=proto.send;
 const selected=new WeakSet<XMLHttpRequest>();let next=0;
 proto.open=function(this:XMLHttpRequest,method:string,url:string|URL,...rest:any[]){
  selected.delete(this);try{if(admit(new URL(String(url),target.location.href)))selected.add(this);}catch{}
  return (open as any).call(this,method,url,...rest);
 } as typeof open;
 proto.send=function(this:XMLHttpRequest,body?:Document|XMLHttpRequestBodyInit|null){
  if(selected.has(this)){
   const id=++next;const now=()=>target.performance.now();
   let notified=false;
   const progress=(e:ProgressEvent)=>{if(this.readyState!==4){evidence.progress(id,now(),e.loaded);if(e.loaded>0&&!notified){notified=true;onTransfer();}}};
   this.addEventListener('progress',progress);this.upload.addEventListener('progress',progress);
   this.addEventListener('loadend',()=>{evidence.end(id,now());this.removeEventListener('progress',progress);this.upload.removeEventListener('progress',progress);},{once:true});
   evidence.start(id,now());try{return send.call(this,body);}catch(error){evidence.end(id,now());throw error;}
  }
  return send.call(this,body);
 };
 return Object.assign(()=>{proto.open=open;proto.send=send;},{include:(xhr:XMLHttpRequest)=>selected.add(xhr)});
}
