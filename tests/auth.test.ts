import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePuterStore } from '../app/lib/puter';

const sdk = () => ({
  auth: { isSignedIn: vi.fn().mockResolvedValue(true), getUser: vi.fn().mockResolvedValue({ uuid: 'a', username: 'A' }), signIn: vi.fn(), signOut: vi.fn() },
  fs: { read: vi.fn().mockResolvedValue(new Blob(['cv'])), upload: vi.fn(), delete: vi.fn(), write: vi.fn(), readdir: vi.fn() },
  kv: { get: vi.fn().mockResolvedValue('private'), set: vi.fn(), del: vi.fn(), list: vi.fn(), flush: vi.fn() },
  ai: { chat: vi.fn(), img2txt: vi.fn() },
});
let puter: ReturnType<typeof sdk>;
afterEach(() => vi.useRealTimers());
beforeEach(() => {
  puter = sdk(); window.puter = puter as unknown as typeof window.puter;
  const s = usePuterStore.getState();
  usePuterStore.setState({ isLoading: true, puterReady: true, auth: { ...s.auth, user: null, isAuthenticated: false } });
});
describe('Puter authentication boundary', () => {
  it('blocks reads, writes, AI and deletes before authentication finishes', async () => {
    const s = usePuterStore.getState();
    for (const call of [() => s.fs.read('cv'), () => s.kv.get('resume:a'), () => s.kv.set('x', 'y'), () => s.fs.delete('cv'), () => s.ai.feedback('cv', 'prompt')]) {
      await expect(call()).rejects.toThrow('authenticated');
    }
    expect(puter.fs.read).not.toHaveBeenCalled(); expect(puter.kv.set).not.toHaveBeenCalled(); expect(puter.ai.chat).not.toHaveBeenCalled();
  });
  it('allows authenticated reads', async () => {
    await usePuterStore.getState().auth.checkAuthStatus();
    expect(await usePuterStore.getState().kv.get('resume:a')).toBe('private');
  });
  it('drops an old read result after logout', async () => {
    await usePuterStore.getState().auth.checkAuthStatus();
    let finish!: (value: string) => void;
    puter.kv.get.mockImplementationOnce(() => new Promise(r => { finish = r; }));
    const pending = usePuterStore.getState().kv.get('resume:a');
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    await usePuterStore.getState().auth.signOut(); finish('private');
    await expect(pending).rejects.toThrow('Session changed');
  });
  it('does not resurrect a user from an auth check completed after logout', async () => {
    let finish!: (value: boolean) => void;
    puter.auth.isSignedIn.mockImplementationOnce(() => new Promise(r => { finish = r; }));
    const pending = usePuterStore.getState().auth.checkAuthStatus();
    await usePuterStore.getState().auth.signOut(); finish(true); await pending;
    expect(usePuterStore.getState().auth.isAuthenticated).toBe(false);
  });
  it('recovers from a storage call that never settles', async () => {
    await usePuterStore.getState().auth.checkAuthStatus();
    vi.useFakeTimers(); puter.kv.get.mockImplementationOnce(() => new Promise(() => {}));
    const pending = usePuterStore.getState().kv.get('resume:a');
    const assertion = expect(pending).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(30000); await assertion;
    expect(await usePuterStore.getState().kv.get('resume:a')).toBe('private');
  });
  it('ends loading after an authentication timeout', async () => {
    vi.useFakeTimers(); puter.auth.isSignedIn.mockImplementationOnce(() => new Promise(() => {}));
    const pending = usePuterStore.getState().auth.checkAuthStatus();
    await vi.advanceTimersByTimeAsync(30000); await pending;
    expect(usePuterStore.getState().isLoading).toBe(false);
    expect(usePuterStore.getState().auth.isAuthenticated).toBe(false);
  });
  it('blocks an SDK mutation after an out-of-band account switch', async () => {
    await usePuterStore.getState().auth.checkAuthStatus();
    puter.auth.getUser.mockResolvedValueOnce({ uuid: 'b', username: 'B' });
    await expect(usePuterStore.getState().kv.set('resume:a', 'private A data')).rejects.toThrow('Session changed');
    expect(puter.kv.set).not.toHaveBeenCalled();
    expect(usePuterStore.getState().auth.isAuthenticated).toBe(false);
  });
});
