import { validFilePath } from '../app/lib/validation';
import { RecoveryError } from './recover-fixture';

interface CleanupIO {
  assertSession: () => void;
  get: (key: string) => Promise<string | null | undefined>;
  getRoot: () => Promise<string>;
  stat: (path: string) => Promise<unknown>;
  read: (path: string) => Promise<Blob | undefined>;
  deleteFile: (path: string) => Promise<unknown>;
  deleteKey: (key: string) => Promise<unknown>;
  sha: (blob: Blob) => Promise<string>;
}

// Reconcile only the exact synthetic B target. In particular, a TypeError is
// never considered evidence of absence; require an explicit metadata not-found.
export async function cleanupBFixture(run: string, expectedPdf: Blob, io: CleanupIO) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(run)) throw new RecoveryError('INVALID_RUN');
  io.assertSession();
  const key=`jobpilot-gate:${run}:B`;
  const marker=`SYNTHETIC-B-${run}`;
  const value=await io.get(key);io.assertSession();
  if (value!==marker) throw new RecoveryError('B_KEY_UNCONFIRMED');
  const root=(await io.getRoot()).replace(/\/$/,'');io.assertSession();
  if (!validFilePath(root) || !/^\/[^/]+\/AppData\/[^/]+$/.test(root)) throw new RecoveryError('B_ROOT_UNCONFIRMED');
  const path=`${root}/jobpilot/resumes/gate-${run}-b/synthetic-B.pdf`;
  const exists=async()=>{
    io.assertSession();
    try {
      const result=await io.stat(path);io.assertSession();
      if (!result || typeof result!=='object') throw new RecoveryError('B_FILE_STAT_UNCONFIRMED');
      return true;
    } catch(error) {
      io.assertSession();
      if (error && typeof error==='object' && 'code' in error && ['subject_does_not_exist','not_found'].includes(String(error.code))) return false;
      throw new RecoveryError('B_FILE_STAT_UNCONFIRMED');
    }
  };
  const fileWasAlreadyAbsent=!await exists();
  let ambiguousDeleteReceipt=false;
  if (!fileWasAlreadyAbsent) {
    if (value!==marker) throw new RecoveryError('B_KEY_UNCONFIRMED');
    const pdf=await io.read(path);io.assertSession();
    if (!pdf || await io.sha(pdf)!==await io.sha(expectedPdf)) throw new RecoveryError('B_FILE_MISMATCH');
    io.assertSession();
    try { await io.deleteFile(path); } catch { io.assertSession();ambiguousDeleteReceipt=true; }
    io.assertSession();
    if (await exists()) throw new RecoveryError('B_FILE_DELETE_UNCONFIRMED');
  }
  io.assertSession();
  // Re-read the key through the guarded SDK before any remaining mutation.
  const current=await io.get(key);io.assertSession();
  if (current!==marker && current!==null) throw new RecoveryError('B_KEY_UNCONFIRMED');
  let ambiguousKeyDeleteReceipt=false;
  if (current===marker) {
    try { await io.deleteKey(key); } catch { io.assertSession();ambiguousKeyDeleteReceipt=true; }
    io.assertSession();
  }
  if (await io.get(key)!==null) throw new RecoveryError('B_KEY_DELETE_UNCONFIRMED');
  io.assertSession();
  return {fileWasAlreadyAbsent,ambiguousDeleteReceipt,ambiguousKeyDeleteReceipt};
}
