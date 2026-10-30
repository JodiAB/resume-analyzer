import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { usePuterStore } from '../app/lib/puter';
import Upload from '../app/routes/upload';
import Home from '../app/routes/home';
import Resume from '../app/routes/resume';
import Wipe from '../app/routes/wipe';
import FileUploader from '../app/components/FileUploader';

vi.mock('../app/lib/pdf2img', () => ({ convertPdfToImage: vi.fn() }));
const original = usePuterStore.getState();
afterEach(() => { cleanup(); usePuterStore.setState(original); });
beforeEach(() => {
  usePuterStore.setState({ ...original, isLoading: false, auth: { ...original.auth, user: { uuid: 'a', username: 'A' }, isAuthenticated: true } });
});
const show = (element: React.ReactElement) => render(<MemoryRouter>{element}</MemoryRouter>);
it.each([['home', Home], ['resume', Resume], ['wipe', Wipe], ['upload', Upload]] as const)('does not mount private %s content before auth readiness', async (_, Page) => {
  const get = vi.fn(); const list = vi.fn(); const readDir = vi.fn();
  usePuterStore.setState({ isLoading: true, auth: { ...original.auth, user: null, isAuthenticated: false }, kv: { ...original.kv, get, list }, fs: { ...original.fs, readDir } });
  show(<Page />);
  expect(screen.queryByRole('button', { name: 'Analyze Resume' })).toBeNull();
  expect(get).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled(); expect(readDir).not.toHaveBeenCalled();
});
it('removes the selected filename without submitting the enclosing form', async () => {
  const submit = vi.fn((e: React.FormEvent) => e.preventDefault()); const selected = vi.fn();
  show(<form onSubmit={submit}><FileUploader onFileSelect={selected} /></form>);
  const input = document.querySelector('input[type=file]')!;
  fireEvent.change(input, { target: { files: [new File(['cv'], 'master.pdf', { type: 'application/pdf' })] } });
  await screen.findByText('master.pdf');
  fireEvent.click(screen.getByRole('button', { name: /remove/i }));
  expect(screen.queryByText('master.pdf')).toBeNull(); expect(submit).not.toHaveBeenCalled(); expect(selected).toHaveBeenLastCalledWith(null);
});
it('shows a recoverable upload error and enables retry', async () => {
  const upload = vi.fn().mockRejectedValue(new Error('offline'));
  usePuterStore.setState({ fs: { ...original.fs, upload }, kv: { ...original.kv, get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(true) } });
  show(<Upload />);
  fireEvent.change(document.querySelector('input[type=file]')!, { target: { files: [new File(['cv'], 'master.pdf', { type: 'application/pdf' })] } });
  await screen.findByText('master.pdf');
  fireEvent.click(screen.getByRole('button', { name: 'Analyze Resume' }));
  await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
  await screen.findByRole('alert');
  const button = screen.getByRole('button', { name: 'Analyze Resume' }) as HTMLButtonElement;
  expect(button.disabled).toBe(false);
  fireEvent.click(button);
  await waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
});
it('keeps valid legacy analysis readable while skipping a corrupt record', async () => {
  const category = { score: 70, tips: [] };
  const feedback = { overallScore: 70, ATS: category, toneAndStyle: category, content: category, structure: category, skills: category };
  const record = { id: 'legacy', companyName: 'Legacy employer', resumePath: '/old/master.pdf', imagePath: '/old/preview.png', feedback };
  usePuterStore.setState({ kv: { ...original.kv, list: vi.fn().mockResolvedValue([{ key: 'resume:legacy', value: JSON.stringify(record) }, { key: 'resume:bad', value: '{' }]) }, fs: { ...original.fs, read: vi.fn().mockRejectedValue(new Error('no preview')) } });
  show(<Home />);
  await screen.findByText('Legacy employer');
  expect((await screen.findByRole('alert')).textContent).toContain('1 incomplete');
});
it('discards a private list that resolves after logout', async () => {
  let finish!: (value: KVItem[]) => void;
  usePuterStore.setState({ kv: { ...original.kv, list: vi.fn(() => new Promise<KVItem[]>(r => { finish = r; })) } });
  show(<Home />);
  await act(async () => { usePuterStore.setState({ auth: { ...original.auth, user: null, isAuthenticated: false } }); finish([]); });
  expect(screen.queryByText('Track Your Applications & Resume Ratings')).toBeNull();
});
it('requires deliberate scoped deletion and never lists the root or flushes KV', async () => {
  const category = { score: 70, tips: [] };
  const feedback = { overallScore: 70, ATS: category, toneAndStyle: category, content: category, structure: category, skills: category };
  const owned = { id: 'abc', resumePath: '/u/AppData/app/jobpilot/resumes/abc/master.pdf', imagePath: '/u/AppData/app/jobpilot/resumes/abc/preview.png', feedback };
  const legacy = { ...owned, id: 'old', resumePath: '/old/master.pdf', imagePath: '/old/preview.png' };
  const deleteFile = vi.fn().mockResolvedValue(undefined); const deleteKey = vi.fn().mockResolvedValue(true); const flush = vi.fn(); const readDir = vi.fn();
  usePuterStore.setState({ kv: { ...original.kv, list: vi.fn().mockResolvedValue([{ key: 'resume:abc', value: JSON.stringify(owned) }, { key: 'resume:old', value: JSON.stringify(legacy) }]), delete: deleteKey, flush }, fs: { ...original.fs, delete: deleteFile, readDir } });
  show(<Wipe />);
  const button = await screen.findByRole('button', { name: 'Delete 1 analyzer resumes' }) as HTMLButtonElement;
  expect(button.disabled).toBe(true); fireEvent.click(button); expect(deleteFile).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(button);
  await waitFor(() => expect(deleteKey).toHaveBeenCalledWith('resume:abc'));
  expect(deleteFile).toHaveBeenCalledTimes(2); expect(flush).not.toHaveBeenCalled(); expect(readDir).not.toHaveBeenCalled();
});
