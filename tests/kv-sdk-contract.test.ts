import { beforeEach, expect, it, vi } from 'vitest';
import { captureSession, usePuterStore } from '../app/lib/puter';
import { cleanupBFixture } from '../verification/cleanup-fixture';

let owner:string;
let data:Map<string,string>;
let sdk:any;
beforeEach(async()=>{
  owner='a';data=new Map([['target','synthetic value'],['unrelated','retain']]);
  sdk={
    auth:{isSignedIn:async()=>true,getUser:async()=>({uuid:owner,username:'Synthetic'}),signIn:async()=>{},signOut:async()=>{}},
    // Deliberately model the documented SDK: del exists; delete does not.
    kv:{get:vi.fn(async(key:string)=>data.get(key)??null),del:vi.fn(async(key:string)=>{data.delete(key);return true;})},
    fs:{delete:vi.fn(),stat:vi.fn(async()=>({path:'/synthetic/AppData/app'}))},
  };
  window.puter=sdk;
  await usePuterStore.getState().auth.checkAuthStatus();
});
it('removes only the requested key through the SDK del API',async()=>{
  await expect(usePuterStore.getState().kv.delete('target')).resolves.toBe(true);
  expect(data.has('target')).toBe(false);expect(data.get('unrelated')).toBe('retain');
  expect(sdk.kv.del).toHaveBeenCalledWith('target');expect(sdk.kv.delete).toBeUndefined();
});
it('still rejects a stale deletion receipt after the SDK owner changes',async()=>{
  let finish!:(value:boolean)=>void;
  sdk.kv.del.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  const pending=usePuterStore.getState().kv.delete('target');
  void pending.catch(()=>{}); // Keep the deliberately broken RED adapter from causing an unhandled test rejection.
  await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
  owner='b';finish(true);
  await expect(pending).rejects.toThrow('Session changed');
  expect(usePuterStore.getState().auth.isAuthenticated).toBe(false);
});
it('completes scoped B cleanup through the real app adapter when its file is already absent',async()=>{
  const run='c1b31397-3dd3-4a57-945a-c6235107b7ae';
  const key=`jobpilot-gate:${run}:B`;data.set(key,`SYNTHETIC-B-${run}`);
  const state=usePuterStore.getState();
  await expect(cleanupBFixture(run,new Blob(['synthetic']),{
    assertSession:captureSession(),get:state.kv.get,getRoot:async()=>'/synthetic/AppData/app',
    stat:async()=>{throw Object.assign(new Error('missing'),{code:'subject_does_not_exist'});},
    read:state.fs.read,deleteFile:state.fs.delete,deleteKey:state.kv.delete,sha:async()=>'',
  })).resolves.toMatchObject({fileWasAlreadyAbsent:true,ambiguousKeyDeleteReceipt:false});
  expect(data.has(key)).toBe(false);expect(data.get('unrelated')).toBe('retain');
  expect(sdk.fs.delete).not.toHaveBeenCalled();
});
