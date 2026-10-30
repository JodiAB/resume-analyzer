import { beforeEach, expect, it, vi } from 'vitest';
import { usePuterStore } from '../app/lib/puter';
import { captureSession } from '../app/lib/puter';
import { analyzeResume, deleteResumeData } from '../app/lib/resume-service';

let owner: string;
let api: any;
beforeEach(async () => {
  owner = 'a';
  api = {
    auth: { isSignedIn: vi.fn(async () => true), getUser: vi.fn(async () => ({ uuid: owner, username: owner })), signIn: vi.fn(), signOut: vi.fn() },
    fs: { read: vi.fn(), upload: vi.fn(), delete: vi.fn(), stat: vi.fn(async () => ({ path: `/${owner}/AppData/app` })) },
    ai: { chat: vi.fn() }, kv: { get: vi.fn(), set: vi.fn(), del: vi.fn() },
  };
  window.puter = api;
  await usePuterStore.getState().auth.checkAuthStatus();
});

// The SDK boundary is controlled here. These are local regressions, not
// evidence that the real Puter service isolates two real accounts.
it.each(['upload', 'AI', 'read', 'delete'] as const)('rejects %s result when SDK owner changes while it is pending, without a focus event', async kind => {
  let finish!: (value: any) => void;
  const deferred = () => new Promise(resolve => { finish = resolve; });
  const state = usePuterStore.getState();
  let pending: Promise<unknown>;
  if (kind === 'upload') { api.fs.upload.mockImplementationOnce(deferred); pending = state.fs.upload([new File(['synthetic'], 'safe.pdf')], 'jobpilot/resumes/test'); }
  else if (kind === 'AI') { api.ai.chat.mockImplementationOnce(deferred); pending = state.ai.feedback('/a/AppData/app/jobpilot/resumes/test/safe.pdf', 'Synthetic test only'); }
  else if (kind === 'read') { api.fs.read.mockImplementationOnce(deferred); pending = state.fs.read('/a/AppData/app/safe.pdf'); }
  else { api.fs.delete.mockImplementationOnce(deferred); pending = state.fs.delete('/a/AppData/app/jobpilot/resumes/test/safe.pdf'); }
  await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
  owner = 'b';
  finish({ path: '/a/AppData/app/safe.pdf', privateMarker: 'SYNTHETIC-A-ONLY' });
  await expect(pending).rejects.toThrow('Session changed');
  expect(usePuterStore.getState().auth.isAuthenticated).toBe(false);
});

it('fails closed when SDK identity cannot be revalidated after a private read', async () => {
  api.fs.read.mockImplementationOnce(async () => {
    api.auth.getUser.mockRejectedValueOnce(new Error('identity unavailable'));
    return new Blob(['SYNTHETIC-A-ONLY']);
  });
  await expect(usePuterStore.getState().fs.read('/a/AppData/app/safe.pdf')).rejects.toThrow();
});

it('rejects a deletion path in a different user/app root before any delete', async () => {
  await expect(usePuterStore.getState().fs.delete('/b/AppData/other-app/jobpilot/resumes/test/safe.pdf')).rejects.toThrow();
  expect(api.fs.delete).not.toHaveBeenCalled();
});
it('stops an upload transaction after a switch without saving or cleaning up using B', async () => {
  api.kv.get.mockResolvedValue(null); api.kv.set.mockResolvedValue(true);
  let finish!: (value: any) => void;
  api.fs.upload.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const state = usePuterStore.getState();
  const pending = analyzeResume({ id: 'test', file: new File(['synthetic'], 'safe.pdf', { type: 'application/pdf' }), companyName: '', jobTitle: '', jobDescription: '' }, {
    assertSession: captureSession(), upload: state.fs.upload, convert: async () => ({ file: new File(['png'], 'preview.png') }),
    feedback: state.ai.feedback, get: state.kv.get, set: state.kv.set, deleteFile: state.fs.delete, deleteKey: state.kv.delete,
  });
  await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
  owner = 'b'; finish({ path: '/a/AppData/app/jobpilot/resumes/test/safe.pdf' });
  await expect(pending).rejects.toThrow('Session changed');
  expect(api.kv.set.mock.calls.filter((call: any[]) => call[0] === 'resume:test')).toHaveLength(0);
  expect(api.fs.delete).not.toHaveBeenCalled(); expect(api.ai.chat).not.toHaveBeenCalled();
});
it('stops a deletion transaction before its second file and metadata after a switch', async () => {
  const category = { score: 60, tips: [] };
  const record = { id: 'test', resumePath: '/a/AppData/app/jobpilot/resumes/test/safe.pdf', imagePath: '/a/AppData/app/jobpilot/resumes/test/preview.png', feedback: { overallScore: 60, ATS: category, toneAndStyle: category, content: category, structure: category, skills: category } };
  let finish!: () => void;
  api.fs.delete.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
  const state = usePuterStore.getState();
  const pending = deleteResumeData('resume:test', JSON.stringify(record), { assertSession: captureSession(), deleteFile: state.fs.delete, deleteKey: state.kv.delete });
  await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
  owner = 'b'; finish();
  await expect(pending).rejects.toThrow('Session changed');
  expect(api.fs.delete).toHaveBeenCalledTimes(1); expect(api.kv.del).not.toHaveBeenCalled();
});
