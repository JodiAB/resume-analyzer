import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Profile from '../app/routes/profile';
import { usePuterStore } from '../app/lib/puter';
import { makeSource, extractProfileSource } from '../app/features/profile/extract';
vi.mock('../app/features/profile/extract', async original => ({ ...await original<object>(), extractProfileSource: vi.fn() }));
const initial = usePuterStore.getState();
let data: Map<string, string>;
beforeEach(() => {
  data = new Map();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_: string, work: () => unknown) => work() } });
  usePuterStore.setState({ ...initial, isLoading: false, auth: { ...initial.auth, user: { uuid: 'a', username: 'A' }, isAuthenticated: true }, kv: { ...initial.kv, list: async () => [...data].map(([key, value]) => ({ key, value })), get: async k => data.get(k) ?? null, set: async (k, v) => { data.set(k, v); return true; } } });
});
afterEach(() => { cleanup(); usePuterStore.setState(initial); vi.clearAllMocks(); });
const show = () => render(<MemoryRouter><Profile /></MemoryRouter>);
async function importCV() {
  vi.mocked(extractProfileSource).mockResolvedValue(await makeSource('safe.pdf', new Uint8Array([1]), ['Skills\nReact']));
  fireEvent.change(screen.getByLabelText('Master CV (PDF)'), { target: { files: [new File(['safe'], 'safe.pdf', { type: 'application/pdf' })] } });
  fireEvent.click(screen.getByRole('button', { name: 'Extract profile' }));
  return screen.findByRole('button', { name: 'Confirm against CV' });
}
it('does not read or render profiles before identity is verified', () => {
  const list = vi.fn(); usePuterStore.setState({ isLoading: true, kv: { ...initial.kv, list } }); show();
  expect(screen.queryByLabelText('Master CV (PDF)')).toBeNull(); expect(list).not.toHaveBeenCalled();
});
it('imports, reviews, edits preferences and reloads an owned immutable profile', async () => {
  const page = show(); await screen.findByText('No saved profile yet.');
  fireEvent.click(await importCV());
  expect(screen.getByText(/CV-backed, candidate confirmed/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Preferred job titles'), { target: { value: 'Frontend developer' } });
  fireEvent.blur(screen.getByLabelText('Preferred job titles'));
  fireEvent.change(screen.getByLabelText('Your time zone (IANA)'), { target: { value: 'Africa/Johannesburg' } });
  fireEvent.click(screen.getByLabelText('I agree to save the profile and extracted CV text privately in Puter.'));
  fireEvent.click(screen.getByRole('button', { name: 'Save private revision' }));
  await screen.findByText(/Private revision saved/); expect(data.size).toBe(1);
  page.unmount(); show();
  await waitFor(() => expect((screen.getByLabelText('Preferred job titles') as HTMLInputElement).value).toBe('Frontend developer'));
  expect(screen.getByText(/CV-backed, candidate confirmed/)).toBeTruthy();
});
it('changing a confirmed skill removes confirmation and unsupported changes cannot be CV-confirmed', async () => {
  show(); await screen.findByText('No saved profile yet.'); fireEvent.click(await importCV());
  fireEvent.change(screen.getByLabelText('Proficiency (leave unknown if absent)'), { target: { value: 'Expert' } });
  expect(screen.queryByText(/CV-backed, candidate confirmed/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm against CV' }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByText('Unconfirmed — excluded from verified qualifications')).toBeTruthy();
});
it('keeps the previous draft when a subsequent PDF import fails', async () => {
  show(); await screen.findByText('No saved profile yet.'); await importCV();
  vi.mocked(extractProfileSource).mockRejectedValue(new Error('invalid PDF'));
  fireEvent.click(screen.getByRole('button', { name: 'Extract profile' }));
  await screen.findByRole('alert'); expect((screen.getByLabelText('Title, skill or qualification') as HTMLInputElement).value).toBe('React');
});
it('unmounts private source and ignores an import result after an account switch', async () => {
  show(); await screen.findByText('No saved profile yet.');
  let release!: (value: any) => void;
  vi.mocked(extractProfileSource).mockImplementation(() => new Promise(resolve => { release = resolve; }));
  fireEvent.change(screen.getByLabelText('Master CV (PDF)'), { target: { files: [new File(['safe'], 'safe.pdf', { type: 'application/pdf' })] } });
  fireEvent.click(screen.getByRole('button', { name: 'Extract profile' }));
  act(() => usePuterStore.setState({ isLoading: true, auth: { ...initial.auth, user: null, isAuthenticated: false } }));
  await act(async () => release(await makeSource('safe.pdf', new Uint8Array([1]), ['Skills\nSecret synthetic skill'])));
  expect(screen.queryByText(/Secret synthetic skill/)).toBeNull(); expect(screen.queryByLabelText('Master CV (PDF)')).toBeNull();
});
