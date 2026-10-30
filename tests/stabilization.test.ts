import { describe, it, expect, vi } from 'vitest';
import { parseFeedback, parseResume, safeNext } from '../app/lib/validation';
import { analyzeResume, deleteResumeData } from '../app/lib/resume-service';

export const feedback = {
  overallScore: 73, ATS: { score: 80, tips: [{ type: 'good', tip: 'Readable' }] },
  ...Object.fromEntries(['toneAndStyle', 'content', 'structure', 'skills'].map(k => [k, {
    score: 70, tips: [{ type: 'improve', tip: 'Clarity', explanation: 'Use concise wording' }],
  }])),
};
const response = () => ({ message: { content: JSON.stringify(feedback), refusal: null } });
const record = (id = 'abc') => ({ id, resumePath: `/u/AppData/app/jobpilot/resumes/${id}/master.pdf`, imagePath: `/u/AppData/app/jobpilot/resumes/${id}/preview.png`, feedback });
function dependencies() {
  return {
    assertSession: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
    upload: vi.fn().mockImplementation(async (files: File[], dir: string) => ({ path: `/u/AppData/app/${dir}/${files[0].name}` })),
    convert: vi.fn().mockResolvedValue({ file: new File(['png'], 'preview.png'), imageUrl: '' }),
    feedback: vi.fn().mockResolvedValue(response()),
    set: vi.fn().mockResolvedValue(true),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    deleteKey: vi.fn().mockResolvedValue(true),
  };
}
const input = () => ({ id: 'abc', file: new File(['%PDF'], 'master.pdf', { type: 'application/pdf' }), companyName: 'Employer', jobTitle: 'Frontend', jobDescription: 'React' });

describe('untrusted feedback and legacy records', () => {
  it('accepts the existing valid feedback shape and legacy resume', () => {
    expect(parseFeedback(response())).toEqual(feedback);
    expect(parseResume(JSON.stringify(record()))).toEqual(record());
  });
  it.each([
    undefined, { message: { refusal: 'No', content: JSON.stringify(feedback) } },
    { message: { content: 'not JSON' } }, { message: { content: [] } },
    { message: { content: '{}' } },
    { message: { content: JSON.stringify({ ...feedback, overallScore: 101 }) } },
    { message: { content: JSON.stringify({ ...feedback, ATS: { score: 12, tips: [{ type: 'invent', tip: 'x' }] } }) } },
  ])('rejects malformed, refused or unsafe feedback %#', value => expect(() => parseFeedback(value)).toThrow());
  it('joins text blocks and accepts a JSON code fence', () => {
    expect(parseFeedback({ message: { content: [{ text: '```json\n' }, { text: JSON.stringify(feedback) + '\n```' }] } })).toEqual(feedback);
  });
  it('rejects incomplete records and external file URLs', () => {
    expect(() => parseResume('{')).toThrow();
    expect(() => parseResume(JSON.stringify({ ...record(), feedback: '' }))).toThrow();
    expect(() => parseResume(JSON.stringify({ ...record(), resumePath: 'https://evil.test/cv' }))).toThrow();
  });
});

describe('upload transaction', () => {
  it('saves only after validated AI feedback and uses an isolated directory', async () => {
    const d = dependencies();
    const result = await analyzeResume(input(), d);
    expect(result.feedback).toEqual(feedback);
    expect(d.set.mock.calls.filter(c => c[0] === 'resume:abc')).toHaveLength(1);
    expect(d.upload.mock.calls[0][1]).toBe('jobpilot/resumes/abc');
    expect(d.set.mock.calls.at(-1)![0]).toBe('resume:abc');
  });
  it.each(['upload', 'convert', 'feedback', 'set'] as const)('cleans known files and permits explicit retry after %s fails', async stage => {
    const d = dependencies();
    d[stage].mockRejectedValueOnce(new Error('service failure'));
    await expect(analyzeResume(input(), d)).rejects.toThrow();
    if (stage !== 'upload' && stage !== 'set') expect(d.deleteFile).toHaveBeenCalled();
    await expect(analyzeResume(input(), d)).resolves.toHaveProperty('feedback', feedback);
  });
  it('rejects missing conversion, failed save and invalid model output', async () => {
    for (const [stage, value] of [['convert', { file: null }], ['set', false], ['feedback', { message: { content: '{}' } }]] as const) {
      const d = dependencies(); d[stage].mockResolvedValueOnce(value);
      await expect(analyzeResume(input(), d)).rejects.toThrow();
    }
  });
  it('does not save or clean up against a changed session', async () => {
    const d = dependencies(); let changed = false;
    d.assertSession.mockImplementation(() => { if (changed) throw new Error('Session changed'); });
    d.feedback.mockImplementation(async () => { changed = true; return response(); });
    await expect(analyzeResume(input(), d)).rejects.toThrow('Session changed');
    expect(d.set.mock.calls.filter(c => c[0] === 'resume:abc')).toHaveLength(0); expect(d.deleteFile).not.toHaveBeenCalled();
  });
  it('retains files when the save response is lost, since the record may exist remotely', async () => {
    const d = dependencies(); d.set.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('response lost'));
    await expect(analyzeResume(input(), d)).rejects.toThrow();
    expect(d.deleteFile).not.toHaveBeenCalled();
  });
  it('cleans both files after a confirmed false save result', async () => {
    const d = dependencies(); d.set.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(analyzeResume(input(), d)).rejects.toThrow();
    expect(d.deleteFile).toHaveBeenCalledTimes(2);
  });
  it('reconciles a lost save response using the same attempt before charging for AI again', async () => {
    const d = dependencies(); const data = new Map<string, string>(); let lose = true;
    d.get.mockImplementation(async (key: string) => data.get(key) ?? null);
    d.set.mockImplementation(async (key: string, value: string) => {
      data.set(key, value);
      if (key === 'resume:abc' && lose) { lose = false; throw new Error('response lost'); }
      return true;
    });
    await expect(analyzeResume(input(), d)).rejects.toThrow();
    await expect(analyzeResume(input(), d)).resolves.toHaveProperty('id', 'abc');
    expect(d.feedback).toHaveBeenCalledTimes(1); expect(d.upload).toHaveBeenCalledTimes(2);
  });
  it('does not rerun AI while an earlier save outcome remains unknown', async () => {
    const d = dependencies(); d.get.mockImplementation(async (key: string) => key.startsWith('resume-pending:') ? JSON.stringify({ id: 'abc', phase: 'saving' }) : null);
    await expect(analyzeResume(input(), d)).rejects.toThrow('save outcome');
    expect(d.feedback).not.toHaveBeenCalled(); expect(d.upload).not.toHaveBeenCalled();
  });
});

describe('scoped deletion', () => {
  it('deletes only exact owned record paths, then its key; never root or unrelated keys', async () => {
    const d = dependencies(); await deleteResumeData('resume:abc', JSON.stringify(record()), d);
    expect(d.deleteFile.mock.calls.map(c => c[0])).toEqual([record().resumePath, record().imagePath]);
    expect(d.deleteKey).toHaveBeenCalledWith('resume:abc');
  });
  it.each([
    ['other:abc', record()], ['resume:wrong', record()],
    ['resume:abc', { ...record(), resumePath: '/u/other.pdf' }],
    ['resume:abc', { ...record(), resumePath: '/u/jobpilot/resumes/abc/../secret.pdf' }],
  ])('refuses unrelated or ambiguous ownership %#', async (key, data) => {
    const d = dependencies(); await expect(deleteResumeData(key, JSON.stringify(data), d)).rejects.toThrow();
    expect(d.deleteFile).not.toHaveBeenCalled(); expect(d.deleteKey).not.toHaveBeenCalled();
  });
  it('retains record when any file deletion fails so retry remains possible', async () => {
    const d = dependencies(); d.deleteFile.mockRejectedValueOnce(new Error('offline'));
    await expect(deleteResumeData('resume:abc', JSON.stringify(record()), d)).rejects.toThrow();
    expect(d.deleteKey).not.toHaveBeenCalled();
  });
  it('awaits file deletion before removing the record', async () => {
    const d = dependencies(); let release!: () => void;
    d.deleteFile.mockImplementationOnce(() => new Promise<void>(r => { release = r; }));
    const pending = deleteResumeData('resume:abc', JSON.stringify(record()), d);
    expect(d.deleteKey).not.toHaveBeenCalled(); release(); await pending;
    expect(d.deleteKey).toHaveBeenCalledTimes(1);
  });
});

describe('auth return paths', () => {
  it.each(['https://evil.test', '//evil.test', '/\\evil.test', '/auth?next=/wipe', '/%2f%2fevil.test', '/missing', '%E0%A4%A'])('rejects %s', path => expect(safeNext('?next=' + encodeURIComponent(path))).toBe('/'));
  it('preserves a permitted resume route', () => expect(safeNext('?next=%2Fresume%2Fabc')).toBe('/resume/abc'));
});
