// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { cleanupAuxiliaryFixtures } from '../verification/cleanup-auxiliary';
const run='c1b31397-3dd3-4a57-945a-c6235107b7ae';
const directory='/synthetic-a/AppData/app/jobpilot/resumes/gate-c1b31397-3dd3-4a57-945a-c6235107b7ae-aux';
const sha=async(blob:Blob)=>Buffer.from(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())).toString('hex');
function io(){
  const files=new Map([['aux.txt',new Blob([`SYNTHETIC AUX ${run}`])]]);
  return {files,assertSession:vi.fn(),get:vi.fn<()=>Promise<string|null>>(async()=>`SYNTHETIC-A-${run}`),getRoot:vi.fn(async()=>'/synthetic-a/AppData/app'),
    list:vi.fn(async()=>[...files.keys()].map(name=>({name,is_dir:false}))),
    read:vi.fn(async(path:string)=>files.get(path.slice(directory.length+1))),
    deleteFile:vi.fn(async(path:string)=>{files.delete(path.slice(directory.length+1));}),sha};
}
it('cleans a matching earlier upload recovered from its exact run folder, then confirms the folder is empty',async()=>{
  const d=io();await expect(cleanupAuxiliaryFixtures(run,d)).resolves.toMatchObject({deleted:1,directory});
  expect(d.deleteFile).toHaveBeenCalledWith(directory+'/aux.txt');expect(d.files.size).toBe(0);
});
it('accepts an already empty run folder without deleting anything',async()=>{
  const d=io();d.files.clear();await expect(cleanupAuxiliaryFixtures(run,d)).resolves.toMatchObject({deleted:0});expect(d.deleteFile).not.toHaveBeenCalled();
});
it('refuses an unexpected filename before reading or deleting any file',async()=>{
  const d=io();d.files.set('unrelated.pdf',new Blob(['do not touch']));
  await expect(cleanupAuxiliaryFixtures(run,d)).rejects.toMatchObject({code:'AUX_UNEXPECTED_CONTENT'});expect(d.read).not.toHaveBeenCalled();expect(d.deleteFile).not.toHaveBeenCalled();
});
it('refuses a known filename whose content differs from the synthetic marker',async()=>{
  const d=io();d.files.set('aux.txt',new Blob(['unrelated content']));
  await expect(cleanupAuxiliaryFixtures(run,d)).rejects.toMatchObject({code:'AUX_CONTENT_MISMATCH'});expect(d.deleteFile).not.toHaveBeenCalled();
});
it('treats only an explicit not-found response as an already absent directory',async()=>{
  const d=io();d.list.mockRejectedValue(Object.assign(new Error('missing'),{code:'subject_does_not_exist'}));
  await expect(cleanupAuxiliaryFixtures(run,d)).resolves.toMatchObject({deleted:0});expect(d.deleteFile).not.toHaveBeenCalled();
});
it('does not treat a listing TypeError as proof of absence',async()=>{
  const d=io();d.list.mockRejectedValueOnce(new TypeError('network parsing'));
  await expect(cleanupAuxiliaryFixtures(run,d)).rejects.toMatchObject({code:'AUX_LIST_UNCONFIRMED'});expect(d.deleteFile).not.toHaveBeenCalled();
});
it('reconciles an ambiguous deletion only after a new listing confirms that target is absent',async()=>{
  const d=io();d.deleteFile.mockImplementationOnce(async(path:string)=>{d.files.delete(path.slice(directory.length+1));throw new TypeError('receipt');});
  await expect(cleanupAuxiliaryFixtures(run,d)).resolves.toMatchObject({deleted:1,ambiguousReceipts:1});
});
it('stops if a failed delete leaves the file present',async()=>{
  const d=io();d.deleteFile.mockRejectedValueOnce(new TypeError('receipt'));
  await expect(cleanupAuxiliaryFixtures(run,d)).rejects.toMatchObject({code:'AUX_DELETE_UNCONFIRMED'});
});
it('stops before deletion when the session changes during content validation',async()=>{
  const d=io();let changed=false;d.read.mockImplementationOnce(async()=>{changed=true;return d.files.get('aux.txt');});
  d.assertSession.mockImplementation(()=>{if(changed)throw new Error('Session changed');});
  await expect(cleanupAuxiliaryFixtures(run,d)).rejects.toThrow('Session changed');expect(d.deleteFile).not.toHaveBeenCalled();
});
it('requires A ownership evidence before listing the test folder',async()=>{
  const d=io();d.get.mockResolvedValueOnce(null);
  await expect(cleanupAuxiliaryFixtures(run,d)).rejects.toMatchObject({code:'A_KEY_NOT_FOUND'});expect(d.list).not.toHaveBeenCalled();expect(d.deleteFile).not.toHaveBeenCalled();
});
