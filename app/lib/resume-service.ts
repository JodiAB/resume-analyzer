import { parseFeedback, parseResume, validFilePath } from './validation';
import { prepareInstructions, AIResponseFormat } from '../../constants';

interface Input { id: string; file: File; companyName: string; jobTitle: string; jobDescription: string }
interface Session { assertSession: () => void }
interface DeleteDependencies extends Session {
  deleteFile: (path: string) => Promise<void>;
  deleteKey: (key: string) => Promise<boolean | undefined>;
}
interface AnalyzeDependencies extends DeleteDependencies {
  get: (key: string) => Promise<string | null | undefined>;
  upload: (files: File[], directory: string) => Promise<{ path: string } | undefined>;
  convert: (file: File) => Promise<{ file: File | null; imageUrl?: string }>;
  feedback: (path: string, message: string) => Promise<unknown>;
  set: (key: string, value: string) => Promise<boolean | undefined>;
}

export function ownsResumePath(id: string, path: string): boolean {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id) || !validFilePath(path)) return false;
  const suffix = `jobpilot/resumes/${id}/`;
  const index = path.indexOf(suffix);
  if (index < 0 || (index > 0 && path[index - 1] !== '/')) return false;
  const name = path.slice(index + suffix.length);
  return name.length > 0 && !name.includes('/');
}

export async function analyzeResume(input: Input, d: AnalyzeDependencies): Promise<Resume> {
  d.assertSession();
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(input.id) || input.file.type !== 'application/pdf' || !input.file.size || input.file.size > 20 * 1024 * 1024) throw new Error('Select a PDF up to 20 MB');
  const paths: string[] = [];
  const key = `resume:${input.id}`;
  const journalKey = `resume-pending:${input.id}`;
  const existing = await d.get(key);
  d.assertSession();
  if (existing) {
    const record = parseResume(existing);
    if (record.id !== input.id) throw new Error('Mismatched saved analysis');
    return record;
  }
  const pending = await d.get(journalKey);
  d.assertSession();
  if (pending && JSON.parse(pending).phase === 'saving') throw new Error('Previous save outcome is unknown. Check your saved analyses before starting a new analysis.');
  let committed = false;
  try {
    const directory = `jobpilot/resumes/${input.id}`;
    if (!await d.set(journalKey, JSON.stringify({ id: input.id, directory, phase: 'uploading' }))) throw new Error('Could not save upload recovery information');
    d.assertSession();
    const uploaded = await d.upload([input.file], directory);
    d.assertSession();
    if (!uploaded || !ownsResumePath(input.id, uploaded.path)) throw new Error('PDF upload failed');
    paths.push(uploaded.path);
    const preview = await d.convert(input.file);
    if (preview.imageUrl) URL.revokeObjectURL(preview.imageUrl);
    d.assertSession();
    if (!preview.file) throw new Error('PDF preview failed');
    const image = await d.upload([preview.file], directory);
    d.assertSession();
    if (!image || !ownsResumePath(input.id, image.path)) throw new Error('Preview upload failed');
    paths.push(image.path);
    const result = await d.feedback(uploaded.path, prepareInstructions({ ...input, AIResponseFormat }));
    d.assertSession();
    const feedback = parseFeedback(result);
    const record = { id: input.id, companyName: input.companyName, jobTitle: input.jobTitle, jobDescription: input.jobDescription, resumePath: uploaded.path, imagePath: image.path, feedback };
    if (!await d.set(journalKey, JSON.stringify({ id: input.id, directory, phase: 'saving' }))) throw new Error('Could not save recovery information');
    d.assertSession();
    committed = true;
    const saved = await d.set(key, JSON.stringify(record));
    // A rejected/ambiguous save may have committed remotely: keep files in that case.
    committed = saved !== false;
    if (!saved) throw new Error('Could not save analysis');
    d.assertSession();
    try { await d.deleteKey(journalKey); } catch { /* Final record remains authoritative. */ }
    d.assertSession();
    return record;
  } catch (error) {
    // Never issue cleanup using a different user's current SDK session.
    d.assertSession();
    if (!committed) {
      for (const path of paths) {
        d.assertSession();
        try { await d.deleteFile(path); } catch { /* Orphan remains private; do not broaden deletion. */ }
      }
      d.assertSession();
      try { await d.set(journalKey, JSON.stringify({ id: input.id, directory: `jobpilot/resumes/${input.id}`, phase: 'failed' })); } catch { /* Earlier journal remains for manual recovery. */ }
    }
    throw error;
  }
}

export async function deleteResumeData(key: string, raw: string, d: DeleteDependencies): Promise<void> {
  d.assertSession();
  const record = parseResume(raw);
  if (key !== `resume:${record.id}` || !ownsResumePath(record.id, record.resumePath) || !ownsResumePath(record.id, record.imagePath)) throw new Error('Legacy or unverified file ownership; files retained');
  for (const path of new Set([record.resumePath, record.imagePath])) {
    d.assertSession();
    try { await d.deleteFile(path); } catch (error) {
      // Confirmed missing files are safe on retry. All other failures preserve metadata.
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'subject_does_not_exist') throw error;
    }
  }
  d.assertSession();
  if (!await d.deleteKey(key)) throw new Error('Files removed, but record deletion failed. Retry.');
}
