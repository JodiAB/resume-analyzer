import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { captureSession, usePuterStore } from '../app/lib/puter';
import { deliverHeldResult } from '../verification/held-result';

let owner:string;
beforeEach(async()=>{
  owner='a';
  window.puter={auth:{isSignedIn:async()=>true,getUser:async()=>({uuid:owner,username:'Synthetic'}),signIn:async()=>{},signOut:async()=>{}},kv:{get:async()=> 'synthetic A response'}} as unknown as typeof window.puter;
  await usePuterStore.getState().auth.checkAuthStatus();
});
afterEach(()=>vi.useRealTimers());
it('allows more than 30 seconds for a manual switch after the real app request finishes, then rejects stale delivery',async()=>{
  vi.useFakeTimers();let release!:()=>void;let ready!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const prepared=new Promise<void>(resolve=>{ready=resolve;});
  const pending=deliverHeldResult(()=>usePuterStore.getState().kv.get('synthetic'),gate,captureSession(),()=>ready());
  const assertion=expect(pending).rejects.toThrow('Session changed');
  await prepared;
  await vi.advanceTimersByTimeAsync(120000);
  owner='b';await usePuterStore.getState().auth.checkAuthStatus();
  release();await assertion;
});
it('returns the original value only when the captured session remains valid',async()=>{
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const ready=vi.fn();
  const pending=deliverHeldResult(async()=> 'synthetic',gate,captureSession(),ready);
  await vi.waitFor(()=>expect(ready).toHaveBeenCalledWith('synthetic'));
  release();await expect(pending).resolves.toBe('synthetic');
});
it('does not mark a failed request as ready',async()=>{
  const ready=vi.fn();
  await expect(deliverHeldResult(async()=>{throw new Error('network failed');},Promise.resolve(),captureSession(),ready)).rejects.toThrow('network failed');
  expect(ready).not.toHaveBeenCalled();
});
