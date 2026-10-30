// @vitest-environment node
import {expect,it} from 'vitest';
import {targetEndpoint,classifyNetworkOutcome,syntheticTransferFile,validSyntheticTransfer} from '../verification/target-network';
it('admits only the exact endpoint for the selected target method, never auth or lookalike origins',()=>{
 expect(targetEndpoint('read',new URL('https://api.puter.com/read?private=ignored'))).toBe(true);
 expect(targetEndpoint('read',new URL('https://api.puter.com/drivers/call'))).toBe(false);
 expect(targetEndpoint('approve-write',new URL('https://api.puter.com/drivers/call'))).toBe(true);
 expect(targetEndpoint('upload',new URL('https://api.puter.com/batch'))).toBe(true);
 for(const u of ['https://api.puter.com/signin','https://api.puter.com.evil/read','http://api.puter.com/read'])expect(targetEndpoint('read',new URL(u))).toBe(false);
});
it('does not mark an unchanged-account completion or unattested switch a stale disclosure',()=>{
 expect(classifyNetworkOutcome({overlap:false,pending:0},false,true,false)).toBe('NOT TESTED');
 expect(classifyNetworkOutcome({overlap:false,pending:0},true,true,false)).toBe('BLOCKED');
 expect(classifyNetworkOutcome({overlap:true,pending:0},true,true,false)).toBe('FAIL');
 expect(classifyNetworkOutcome({overlap:true,pending:0},true,false,true)).toBe('PASS');
 expect(classifyNetworkOutcome({overlap:true,pending:1},true,false,true)).toBe('BLOCKED');
 expect(classifyNetworkOutcome({overlap:true,pending:0},true,false,false)).toBe('BLOCKED');
});
it('makes a bounded named synthetic transfer whose exact bytes can be recognized for cleanup',async()=>{
 const run='a4f35acf-8075-4d96-a199-ed2a913de318';const f=syntheticTransferFile(run);
 expect(f.name).toBe('network-'+run+'.bin');expect(f.size).toBe(2*1024*1024);
 expect(await validSyntheticTransfer(f,run)).toBe(true);expect(await validSyntheticTransfer(new Blob(['unrelated']),run)).toBe(false);
 expect(()=>syntheticTransferFile('../unsafe')).toThrow();
});
it('correlates a selected SDK request, excludes auth, and restores the SDK on completion',async()=>{
 const {instrumentTarget}=await import('../verification/target-network');let time=1,transfers=0,request:any,resolve!:()=>void;
 class X extends EventTarget {upload=new EventTarget();readyState=1;open(_m:string,_u:string){}send(){} }
 const target={XMLHttpRequest:X,location:{href:'https://api.puter.com/'},performance:{now:()=>time}} as any;
 const sdk={fs:{read:()=>{request=new X();request.open('GET','https://api.puter.com/read?private=not-exported');request.send();return new Promise<void>(r=>resolve=r);}},kv:{list:()=>[]}};
 const original=sdk.fs.read,scope=instrumentTarget(target,sdk,'read',()=>transfers++);
 const auth=new X();auth.open('GET','https://api.puter.com/signin');auth.send();
 const work=sdk.fs.read();time=10;const progress=new Event('progress');Object.defineProperty(progress,'loaded',{value:32});request.upload.dispatchEvent(progress);
 expect(transfers).toBe(1);time=20;scope.evidence.changed(time);time=30;request.readyState=4;request.dispatchEvent(new Event('loadend'));resolve();await work;
 expect(scope.evidence.summary()).toEqual({requests:1,transfers:1,overlap:true,pending:0});expect(scope.state()).toEqual({dispatched:true,settled:true});scope.stop();expect(sdk.fs.read).toBe(original);
});
it('admits the actual auxiliary deletion endpoint without confusing it with KV reads',()=>{
 expect(targetEndpoint('delete',new URL('https://api.puter.com/delete'))).toBe(true);
 expect(targetEndpoint('delete',new URL('https://api.puter.com/drivers/call'))).toBe(false);
});
it('observes document generation private preparation reads without claiming local rendering is a network transfer',()=>{
 expect(targetEndpoint('generate',new URL('https://api.puter.com/drivers/call'))).toBe(true);
 expect(targetEndpoint('generate',new URL('http://127.0.0.1:5176/local-font.woff'))).toBe(false);
});
