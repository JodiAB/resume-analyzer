import { validFilePath } from '../app/lib/validation';

interface RecoveryIO {
  assertSession: () => void;
  get: (key: string) => Promise<string | null | undefined>;
  getRoot: () => Promise<string>;
  read: (path: string) => Promise<Blob | undefined>;
  sha: (blob: Blob) => Promise<string>;
}
export class RecoveryError extends Error {
  constructor(public code: string) { super(code); this.name='RecoveryError'; }
}

// Read-only recovery for this synthetic verification protocol. It never lists
// documents, writes keys, creates files or accesses authentication credentials.
export async function recoverAFixture(run: string, expectedPdf: Blob, io: RecoveryIO) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(run)) throw new RecoveryError('INVALID_RUN');
  io.assertSession();
  const key=`jobpilot-gate:${run}:A`;
  const marker=`SYNTHETIC-A-${run}`;
  if (await io.get(key)!==marker) throw new RecoveryError('A_KEY_NOT_FOUND');
  io.assertSession();
  let root: string;
  try { root=(await io.getRoot()).replace(/\/$/,''); } catch { throw new RecoveryError('A_ROOT_UNCONFIRMED'); }
  io.assertSession();
  if (!validFilePath(root) || !/^\/[^/]+\/AppData\/[^/]+$/.test(root)) throw new RecoveryError('A_ROOT_UNCONFIRMED');
  // Keep the absolute A path: a relative path under B would test B's own
  // namespace and could falsely appear to demonstrate cross-account denial.
  const path=`${root}/jobpilot/resumes/gate-${run}-a/synthetic-A.pdf`;
  let pdf: Blob | undefined;
  try { pdf=await io.read(path); } catch { io.assertSession(); throw new RecoveryError('A_READ_UNCONFIRMED'); }
  io.assertSession();
  if (!pdf) throw new RecoveryError('A_READ_UNCONFIRMED');
  const [actual,expected]=await Promise.all([io.sha(pdf),io.sha(expectedPdf)]);
  io.assertSession();
  if (actual!==expected) throw new RecoveryError('A_FILE_MISMATCH');
  return {path,key,marker,hash:actual};
}
