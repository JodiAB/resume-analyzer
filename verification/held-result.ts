// Test-only consumer delay. The actual guarded SDK request must finish before
// waiting for a human account switch, so production RPC timeouts stay intact.
export async function deliverHeldResult<T>(request:()=>Promise<T>,release:Promise<void>,assertSession:()=>void,onReady:(value:T)=>void):Promise<T>{
  assertSession();
  const value=await request();
  assertSession();
  onReady(value);
  await release;
  assertSession();
  return value;
}
