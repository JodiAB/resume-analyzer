// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { recoverAFixture } from '../verification/recover-fixture';

const run = 'c1b31397-3dd3-4a57-945a-c6235107b7ae';
const expected = new Blob(['synthetic original A bytes']);
const sha = async (blob: Blob) => Buffer.from(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())).toString('hex');
function io() {
  return {
    assertSession: vi.fn(), get: vi.fn(async () => `SYNTHETIC-A-${run}`),
    getRoot: vi.fn(async () => '/test-a/AppData/test-app'),
    read: vi.fn(async () => expected), sha,
  };
}
it('recovers the existing A reference from exact key and PDF hash without writes', async () => {
  const d=io(); const result=await recoverAFixture(run,expected,d);
  expect(result.path).toBe('/test-a/AppData/test-app/jobpilot/resumes/gate-c1b31397-3dd3-4a57-945a-c6235107b7ae-a/synthetic-A.pdf');
  expect(result.key).toBe('jobpilot-gate:c1b31397-3dd3-4a57-945a-c6235107b7ae:A');
  expect(d.get).toHaveBeenCalledWith('jobpilot-gate:c1b31397-3dd3-4a57-945a-c6235107b7ae:A');
  expect(d.read).toHaveBeenCalledWith(result.path);
});
it('refuses an account that cannot see the original A marker before reading any file', async () => {
  const d=io(); d.get.mockResolvedValueOnce('unrelated');
  await expect(recoverAFixture(run,expected,d)).rejects.toMatchObject({code:'A_KEY_NOT_FOUND'});
  expect(d.read).not.toHaveBeenCalled(); expect(d.getRoot).not.toHaveBeenCalled();
});
it('rejects a different PDF even when the marker is present', async () => {
  const d=io(); d.read.mockResolvedValueOnce(new Blob(['different synthetic content']));
  await expect(recoverAFixture(run,expected,d)).rejects.toMatchObject({code:'A_FILE_MISMATCH'});
});
it('fails closed if the app root cannot be established', async () => {
  const d=io(); d.getRoot.mockResolvedValueOnce('/');
  await expect(recoverAFixture(run,expected,d)).rejects.toMatchObject({code:'A_ROOT_UNCONFIRMED'});
  expect(d.read).not.toHaveBeenCalled();
});
it('does not turn a missing or inaccessible PDF into a successful recovery', async () => {
  const d=io(); d.read.mockRejectedValueOnce(new Error('not available'));
  await expect(recoverAFixture(run,expected,d)).rejects.toMatchObject({code:'A_READ_UNCONFIRMED'});
});
it('rejects invalid run IDs before contacting storage', async () => {
  const d=io();
  await expect(recoverAFixture('../../other',expected,d)).rejects.toMatchObject({code:'INVALID_RUN'});
  expect(d.get).not.toHaveBeenCalled(); expect(d.read).not.toHaveBeenCalled();
});
it('stops recovery if the session changes while retrieving the root', async () => {
  const d=io(); let changed=false;
  d.getRoot.mockImplementation(async()=>{changed=true;return '/test-a/AppData/test-app';});
  d.assertSession.mockImplementation(()=>{if(changed)throw new Error('Session changed');});
  await expect(recoverAFixture(run,expected,d)).rejects.toThrow('Session changed');
  expect(d.read).not.toHaveBeenCalled();
});
