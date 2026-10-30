import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Jobs from '../app/routes/jobs';
import { usePuterStore } from '../app/lib/puter';
import { fetchJobs } from '../app/features/jobs/client';
import { normalizePosting } from '../app/features/jobs/adapters.server';
import { getBoard } from '../app/features/jobs/boards';
import { gh, checked } from './fixtures/jobs';
vi.mock('../app/features/jobs/client', () => ({ fetchJobs: vi.fn() }));
const original = usePuterStore.getState(); let data: Map<string,string>;
beforeEach(() => {
  data = new Map();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: (_: string, work: () => unknown) => work() } });
  usePuterStore.setState({ ...original, isLoading: false, auth: { ...original.auth, user: { uuid: 'a', username: 'Synthetic' }, isAuthenticated: true }, kv: { ...original.kv, list: async pattern => [...data].filter(([key]) => key.startsWith(pattern.replace('*',''))).map(([key,value]) => ({key,value})), get: async key => data.get(key) ?? null, set: async (key,value) => { data.set(key,value); return true; } } });
  vi.mocked(fetchJobs).mockImplementation(async input => ({ jobs: input.source === 'greenhouse' ? [normalizePosting(getBoard('greenhouse','greenhouse'), { ...gh, first_published: new Date().toISOString() }, new Date().toISOString())!] : [], checkedAt: new Date().toISOString(), nextOffset: null, complete: true, missing: false }));
});
afterEach(() => { cleanup(); usePuterStore.setState(original); vi.clearAllMocks(); });
const show = () => render(<MemoryRouter><Jobs /></MemoryRouter>);
it('does not read preferences or saved jobs before account identity is ready', () => {
  const list = vi.fn(); usePuterStore.setState({ isLoading: true, kv: { ...original.kv,list } }); show();
  expect(list).not.toHaveBeenCalled(); expect(screen.queryByRole('button',{name:'Discover jobs'})).toBeNull();
});
it('discovers jobs, persists dismissal and does not show an updated vacancy as new', async () => {
  show(); await screen.findByText('Ready to discover public jobs.');
  fireEvent.click(screen.getByRole('button',{name:'Discover jobs'}));
  await screen.findByRole('heading',{name:'Frontend Developer'});
  fireEvent.click(screen.getByRole('button',{name:'Dismiss'}));
  await waitFor(() => expect(screen.queryByRole('heading',{name:'Frontend Developer'})).toBeNull());
  fireEvent.click(screen.getByRole('button',{name:'Discover jobs'}));
  await screen.findByText('Discovery complete. Review saved job evidence before applying.');
  expect(screen.queryByRole('heading',{name:'Frontend Developer'})).toBeNull();
  fireEvent.change(screen.getByLabelText('Job view'),{target:{value:'DISMISSED'}});
  expect(screen.getByRole('heading',{name:'Frontend Developer'})).toBeTruthy();
});
it('keeps a stored snapshot when a source recheck fails', async () => {
  show(); await screen.findByText('Ready to discover public jobs.');
  fireEvent.click(screen.getByRole('button',{name:'Discover jobs'})); await screen.findByRole('heading',{name:'Frontend Developer'});
  vi.mocked(fetchJobs).mockRejectedValue(new Error('outage'));
  fireEvent.click(screen.getByRole('button',{name:'Recheck source'}));
  await screen.findByText('SOURCE_ERROR'); expect(screen.getByRole('heading',{name:'Frontend Developer'})).toBeTruthy();
});
it('imports pasted hostile HTML as inert text without fetching an arbitrary URL', async () => {
  show(); await screen.findByText('Ready to discover public jobs.');
  fireEvent.change(screen.getByLabelText('Job URL'),{target:{value:'https://careers.example.com/role'}});
  fireEvent.change(screen.getByLabelText('Job title'),{target:{value:'Frontend Developer'}});
  fireEvent.change(screen.getByLabelText('Pasted job description'),{target:{value:'<img src=x onerror=alert(1)> React required'}});
  fireEvent.click(screen.getByRole('button',{name:'Import job'}));
  await screen.findByRole('heading',{name:'Frontend Developer'}); expect(fetchJobs).not.toHaveBeenCalled();
  expect(document.querySelector('img[src=x]')).toBeNull(); expect(screen.getByText('UNVERIFIED')).toBeTruthy();
});
it('rejects stale public discovery delivery after account switching', async () => {
  let finish!: (v: any) => void; vi.mocked(fetchJobs).mockImplementation(() => new Promise(resolve => { finish=resolve; }));
  show(); await screen.findByText('Ready to discover public jobs.'); fireEvent.click(screen.getByRole('button',{name:'Discover jobs'}));
  act(() => usePuterStore.setState({ isLoading:true,auth:{...original.auth,user:null,isAuthenticated:false} }));
  await act(async()=>finish({jobs:[normalizePosting(getBoard('greenhouse','greenhouse'),gh,checked)],checkedAt:checked,nextOffset:null,complete:true,missing:false}));
  expect(screen.queryByRole('heading',{name:'Frontend Developer'})).toBeNull(); expect(data.size).toBe(0);
});
