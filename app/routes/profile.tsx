import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import PrivateBoundary from '../components/PrivateBoundary';
import { captureSession, usePuterStore } from '../lib/puter';
import { extractProfileSource, suggestClaims } from '../features/profile/extract';
import { currentProfileRepository } from '../features/profile/repository';
import { confirmClaim, editClaim, emptyPreferences, emptyValues, type Claim, type ProfileRevision } from '../features/profile/schema';
import ClaimEditor from '../features/profile/ClaimEditor';
import PreferencesEditor from '../features/profile/PreferencesEditor';

function ProfileEditor() {
  const [draft, setDraft] = useState<ProfileRevision | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(true); const running = useRef(false);
  const [error, setError] = useState(''); const [status, setStatus] = useState('Loading private profile…');
  const [blocked, setBlocked] = useState(false); const [consent, setConsent] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const attempt = useRef<ProfileRevision | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const assertSession = captureSession();
    void currentProfileRepository().load().then(result => {
      assertSession(); if (!mounted.current) return;
      setBlocked(result.conflict); setDraft(result.latest); setParentId(result.latest?.id || null);
      setStatus(result.conflict ? 'Concurrent revisions detected. Editing is blocked; retain your records for review.' : result.latest ? 'Private profile loaded. Changes require a new revision.' : 'No saved profile yet.');
    }).catch(() => { if (mounted.current) { setError('Could not verify profile history. Reload to retry; editing is blocked.'); setBlocked(true); } }).finally(() => { if (mounted.current) setBusy(false); });
    return () => { mounted.current = false; };
  }, []);
  const update = (next: ProfileRevision) => { attempt.current = null; setDraft(next); setStatus('Unsaved changes. Review modified claims before saving.'); };
  const importFile = async () => {
    if (!file || running.current || blocked) return;
    running.current = true; setBusy(true); setError('');
    const assertSession = captureSession();
    try {
      const source = await extractProfileSource(file); assertSession(); if (!mounted.current) return;
      const ownerId = usePuterStore.getState().auth.user!.uuid;
      update({ schemaVersion: 1, id: crypto.randomUUID(), ownerId, parentId, createdAt: new Date().toISOString(), source, claims: suggestClaims(source), preferences: draft?.preferences || emptyPreferences() });
      setConsent(false); setStatus('CV extracted locally. Review each suggested claim. Unrecognized layouts can be entered using exact source passages.');
    } catch { if (mounted.current) setError('Could not extract this PDF. Use a readable, unencrypted text PDF up to 20 MB and 50 pages. Your previous draft is retained; scanned CVs require a text version.'); }
    finally { running.current = false; if (mounted.current) setBusy(false); }
  };
  const changeClaim = (id: string, change: Partial<Claim>) => {
    if (!draft) return;
    update({ ...draft, claims: draft.claims.map(c => c.id === id ? editClaim(c, change) : c) });
  };
  const confirm = (id: string, basis: 'cv' | 'attestation') => {
    if (!draft) return; setError('');
    try { update({ ...draft, claims: draft.claims.map(c => c.id === id ? confirmClaim(c, draft.source, basis) : c) }); }
    catch { setError('Confirmation refused. Every CV-backed value must appear in its exact evidence passage, with valid dates. Facts outside the CV need an attestation reason of at least 10 characters.'); }
  };
  const save = async () => {
    if (!draft || running.current || blocked || !consent) return;
    const assertSession = captureSession(); running.current = true; setBusy(true); setError('');
    try {
      attempt.current ||= { ...draft, id: crypto.randomUUID(), parentId, createdAt: new Date().toISOString() };
      const saved = await currentProfileRepository().save(attempt.current); assertSession(); if (!mounted.current) return;
      setDraft(saved); setParentId(saved.id); attempt.current = null; setStatus('Private revision saved and read back successfully.');
    } catch { if (mounted.current) setError('Save was not confirmed. Check evidence, dates, salary and IANA time zones. Keep this unchanged draft to reconcile a possible save on retry, or reload to check for conflicts. A browser with Web Locks support is required.'); }
    finally { running.current = false; if (mounted.current) setBusy(false); }
  };
  return <main className="min-h-screen bg-slate-50"><Navbar /><section className="main-section max-w-5xl mx-auto pb-16">
    <div className="page-heading py-8"><h1>Verified candidate profile</h1><h2>Your evidence, reviewed by you</h2></div>
    <p>Employment, freelance work and personal projects stay separate. Confirmation records your review of your CV; it is not independent employment verification. No AI inference or experience totals are generated.</p>
    <p>The PDF is read locally. Saving stores extracted CV text, evidence, preferences and revision history privately in your Puter account. The original PDF is not uploaded by this workflow. Keep your original copy. No personal data is stored in browser localStorage or sent to job sites.</p>
    <p role="status" aria-live="polite">{status}</p>{error && <p role="alert" className="text-red-800">{error}</p>}
    <fieldset disabled={busy || blocked} className="flex flex-col gap-5 w-full" aria-busy={busy}>
      <div className="form-div"><label htmlFor="master-cv">Master CV (PDF)</label><input id="master-cv" type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} /><button type="button" disabled={!file} className="primary-button w-fit" onClick={() => void importFile()}>Extract profile</button></div>
      {draft && <>
        <details className="border rounded-xl p-4 bg-white"><summary className="cursor-pointer font-semibold">Read extracted CV evidence ({draft.source.pages.length} pages)</summary>{draft.source.pages.map(p => <section key={p.page} aria-label={`Source page ${p.page}`}><h3>Page {p.page}</h3><pre className="whitespace-pre-wrap break-words font-sans">{p.text}</pre></section>)}</details>
        {draft.claims.length === 0 && <p>No claims were recognized. Add a claim and attach an exact passage from the extracted pages.</p>}
        {draft.claims.map((c, index) => <ClaimEditor key={`${draft.source.fileHash}-${c.id}`} claim={c} source={draft.source} index={index} change={change => changeClaim(c.id, change)} confirm={basis => confirm(c.id, basis)} remove={() => update({ ...draft, claims: draft.claims.filter(v => v.id !== c.id) })} />)}
        <button type="button" className="border rounded-lg p-2 w-fit" disabled={draft.claims.length >= 250} onClick={() => update({ ...draft, claims: [...draft.claims, { id: crypto.randomUUID(), kind: 'employment', values: emptyValues(), evidence: null, correctionReason: '', basis: null, confirmedAt: null }] })}>Add evidence-backed claim</button>
        <PreferencesEditor key={draft.source.fileHash + parentId} value={draft.preferences} change={preferences => update({ ...draft, preferences })} />
        <p>CV-backed confirmations and candidate attestations remain distinct. Unconfirmed claims can be saved as drafts but cannot support verified qualifications.</p>
        <label className="flex items-center gap-2"><input style={{ width: '1rem', height: '1rem', padding: 0, boxShadow: 'none' }} type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> I agree to save the profile and extracted CV text privately in Puter.</label>
        <button type="button" disabled={!consent} className="primary-button w-fit" onClick={() => void save()}>Save private revision</button>
      </>}
    </fieldset>
  </section></main>;
}
export default function Profile() { return <PrivateBoundary><ProfileEditor /></PrivateBoundary>; }
