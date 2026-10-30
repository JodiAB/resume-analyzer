// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { cleanupBFixture } from '../verification/cleanup-fixture';
const run='c1b31397-3dd3-4a57-945a-c6235107b7ae';
const pdf=new Blob(['synthetic B bytes']);
const missing=()=>Object.assign(new Error('missing'),{code:'subject_does_not_exist'});
const sha=async (blob:Blob)=>Buffer.from(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())).toString('hex');
function io(){
  let key:string|null=`SYNTHETIC-B-${run}`;
  return {assertSession:vi.fn(),get:vi.fn(async()=>key),getRoot:vi.fn(async()=>'/test-b/AppData/test-app'),
    stat:vi.fn(async()=>{throw missing();}),read:vi.fn(async()=>pdf),deleteFile:vi.fn(async()=>{}),
    deleteKey:vi.fn(async()=>{key=null;return true;}),sha};
}
it('finishes key cleanup when the earlier file deletion already succeeded, without a missing-file read',async()=>{
  const d=io();const result=await cleanupBFixture(run,pdf,d);
  expect(result.fileWasAlreadyAbsent).toBe(true);expect(d.read).not.toHaveBeenCalled();expect(d.deleteFile).not.toHaveBeenCalled();
  expect(d.deleteKey).toHaveBeenCalledWith('jobpilot-gate:c1b31397-3dd3-4a57-945a-c6235107b7ae:B');
});
it('validates full synthetic contents before deleting a present file and confirms absence afterwards',async()=>{
  const d=io();d.stat.mockResolvedValueOnce({path:'synthetic'} as never);
  await expect(cleanupBFixture(run,pdf,d)).resolves.toMatchObject({fileWasAlreadyAbsent:false});
  expect(d.deleteFile).toHaveBeenCalledWith('/test-b/AppData/test-app/jobpilot/resumes/gate-c1b31397-3dd3-4a57-945a-c6235107b7ae-b/synthetic-B.pdf');
});
it('reconciles an ambiguous delete receipt only when a fresh stat confirms absence',async()=>{
  const d=io();d.stat.mockResolvedValueOnce({path:'synthetic'} as never);d.deleteFile.mockRejectedValueOnce(new TypeError('SDK receipt'));
  await expect(cleanupBFixture(run,pdf,d)).resolves.toMatchObject({ambiguousDeleteReceipt:true});
});
it('retains the key when delete throws TypeError and the file still exists',async()=>{
  const d=io();d.stat.mockResolvedValue({path:'synthetic'} as never);d.deleteFile.mockRejectedValueOnce(new TypeError('SDK receipt'));
  await expect(cleanupBFixture(run,pdf,d)).rejects.toMatchObject({code:'B_FILE_DELETE_UNCONFIRMED'});
  expect(d.deleteKey).not.toHaveBeenCalled();
});
it('does not treat TypeError during stat as confirmed absence',async()=>{
  const d=io();d.stat.mockRejectedValueOnce(new TypeError('network parsing'));
  await expect(cleanupBFixture(run,pdf,d)).rejects.toMatchObject({code:'B_FILE_STAT_UNCONFIRMED'});
  expect(d.deleteFile).not.toHaveBeenCalled();expect(d.deleteKey).not.toHaveBeenCalled();
});
it('rejects an unrelated account marker without deleting anything',async()=>{
  const d=io();d.get.mockResolvedValueOnce('unrelated');
  await expect(cleanupBFixture(run,pdf,d)).rejects.toMatchObject({code:'B_KEY_UNCONFIRMED'});
  expect(d.deleteFile).not.toHaveBeenCalled();expect(d.deleteKey).not.toHaveBeenCalled();
});
it('does not label an empty namespace as verified B cleanup',async()=>{
  const d=io();d.get.mockResolvedValueOnce(null);
  await expect(cleanupBFixture(run,pdf,d)).rejects.toMatchObject({code:'B_KEY_UNCONFIRMED'});
  expect(d.getRoot).not.toHaveBeenCalled();expect(d.deleteFile).not.toHaveBeenCalled();expect(d.deleteKey).not.toHaveBeenCalled();
});
it('does not delete a document with different contents',async()=>{
  const d=io();d.stat.mockResolvedValueOnce({path:'synthetic'} as never);d.read.mockResolvedValueOnce(new Blob(['not the fixture']));
  await expect(cleanupBFixture(run,pdf,d)).rejects.toMatchObject({code:'B_FILE_MISMATCH'});
  expect(d.deleteFile).not.toHaveBeenCalled();expect(d.deleteKey).not.toHaveBeenCalled();
});
it('stops before key deletion if the session changes during file deletion',async()=>{
  const d=io();let changed=false;d.stat.mockResolvedValueOnce({path:'synthetic'} as never);
  d.deleteFile.mockImplementationOnce(async()=>{changed=true;});d.assertSession.mockImplementation(()=>{if(changed)throw new Error('Session changed');});
  await expect(cleanupBFixture(run,pdf,d)).rejects.toThrow('Session changed');expect(d.deleteKey).not.toHaveBeenCalled();
});
