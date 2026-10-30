import {expect,it} from 'vitest';
import {NetworkEvidence} from '../verification/network-evidence';
it('never treats an SDK promise or a sent but unobserved request as transfer overlap',()=>{
 const e=new NetworkEvidence();expect(e.summary().overlap).toBe(false);
 e.start(1,10);e.changed(20);expect(e.summary().overlap).toBe(false);
});
it('requires observed transferred bytes before identity change and settlement afterwards',()=>{
 const e=new NetworkEvidence();e.start(1,10);e.progress(1,15,32);e.changed(20);e.end(1,30);
 expect(e.summary()).toEqual({requests:1,transfers:1,overlap:true,pending:0});
});
it('does not attest completed requests, zero bytes, or bytes first observed after the switch',()=>{
 for(const [bytesAt,endAt,bytes] of [[15,19,32],[15,30,0],[21,30,32]]){
  const e=new NetworkEvidence();e.start(1,10);e.progress(1,bytesAt,bytes);e.end(1,endAt);e.changed(20);expect(e.summary().overlap).toBe(false);
 }
});
it('ignores stray progress and duplicate starts and exports counts only',()=>{
 const e=new NetworkEvidence();e.progress(9,10,50);e.start(1,10);e.start(1,11);e.changed(12);
 expect(e.summary()).toEqual({requests:1,transfers:0,overlap:false,pending:1});
 expect(JSON.stringify(e.summary())).not.toMatch(/url|token|path|owner/i);
});
