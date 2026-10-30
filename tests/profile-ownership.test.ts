import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { currentProfileRepository } from '../app/features/profile/repository';
import { usePuterStore } from '../app/lib/puter';
import { makeSource } from '../app/features/profile/extract';
import { emptyPreferences, type ProfileRevision } from '../app/features/profile/schema';
let owner: string; let sdk: any;
const initial = usePuterStore.getState();
beforeEach(async () => {
  owner = 'a';
  sdk = { auth: { isSignedIn: async () => true, getUser: async () => ({ uuid: owner, username: owner }) }, kv: { list: vi.fn(async () => []), get: vi.fn(async () => null), set: vi.fn(async () => true) } };
  window.puter = sdk;
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_: string, work: () => unknown) => work() } });
  await usePuterStore.getState().auth.checkAuthStatus();
});
afterEach(() => usePuterStore.setState(initial));
// Real store guards, controlled SDK. These do NOT certify live service isolation.
it.each(['list', 'get', 'set'] as const)('rejects profile %s completion after SDK identity changes without a focus event', async operation => {
  let finish!: (value: any) => void;
  sdk.kv[operation].mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const repo = currentProfileRepository();
  const revision: ProfileRevision = { schemaVersion: 1, id: 'rev-1', ownerId: 'a', parentId: null, createdAt: new Date().toISOString(), source: await makeSource('safe.pdf', new Uint8Array([1]), ['Skills\nReact']), claims: [], preferences: emptyPreferences() };
  const pending = operation === 'list' ? repo.load() : repo.save(revision);
  const failure = expect(pending).rejects.toThrow('Session');
  await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
  owner = 'b'; finish(operation === 'list' ? [] : operation === 'get' ? null : true);
  await failure; expect(usePuterStore.getState().auth.isAuthenticated).toBe(false);
  if (operation !== 'set') expect(sdk.kv.set).not.toHaveBeenCalled();
});
it('refuses ambiguous or signed-out identity before enumerating profile keys', () => {
  usePuterStore.setState({ isLoading: false, auth: { ...initial.auth, isAuthenticated: false, user: null } });
  expect(() => currentProfileRepository()).toThrow(); expect(sdk.kv.list).not.toHaveBeenCalled();
});
