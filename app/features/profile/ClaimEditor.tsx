import { useState } from 'react';
import { kinds, type Claim, type Source, type Evidence } from './schema';

interface Props { claim: Claim; source: Source; index: number; change: (update: Partial<Claim>) => void; confirm: (basis: 'cv' | 'attestation') => void; remove: () => void }
const labels: Record<keyof Claim['values'], string> = { label: 'Title, skill or qualification', organization: 'Employer, client or institution', start: 'Start date (YYYY, YYYY-MM or YYYY-MM-DD)', end: 'End date (or present)', proficiency: 'Proficiency (leave unknown if absent)', url: 'Portfolio or evidence URL (HTTPS)' };
export default function ClaimEditor({ claim: c, source, index, change, confirm, remove }: Props) {
  const [page, setPage] = useState(c.evidence?.page || 1);
  const [quote, setQuote] = useState(c.evidence?.quote || '');
  const [error, setError] = useState('');
  const attach = () => {
    const text = source.pages.find(p => p.page === page)?.text || '';
    const start = text.indexOf(quote);
    if (!quote.trim() || start < 0 || quote.length > 20000) { setError('Copy an exact passage from the selected source page (up to 20,000 characters).'); return; }
    const evidence: Evidence = { page, start, end: start + quote.length, quote };
    change({ evidence }); setError('');
  };
  return <fieldset className="border border-gray-200 rounded-xl p-5 flex flex-col gap-3 bg-white">
    <legend className="font-semibold px-2">{c.kind} {index + 1}</legend>
    <label htmlFor={`${c.id}-kind`}>Experience / qualification category</label>
    <select id={`${c.id}-kind`} value={c.kind} onChange={e => change({ kind: e.target.value as Claim['kind'] })}>{kinds.map(k => <option key={k} value={k}>{k}</option>)}</select>
    <div className="grid md:grid-cols-2 gap-3">{(Object.keys(labels) as (keyof Claim['values'])[]).map(key => <div className="form-div" key={key}>
      <label htmlFor={`${c.id}-${key}`}>{labels[key]}</label>
      <input id={`${c.id}-${key}`} maxLength={2000} value={c.values[key]} onChange={e => change({ values: { ...c.values, [key]: e.target.value } })} />
    </div>)}</div>
    <p className="font-medium">{!c.confirmedAt ? 'Unconfirmed — excluded from verified qualifications' : c.basis === 'cv' ? 'CV-backed, candidate confirmed' : 'Candidate-attested — not supported by the supplied CV'}</p>
    {c.evidence && <blockquote className="border-l-4 border-blue-200 pl-3 whitespace-pre-wrap">Page {c.evidence.page}: {c.evidence.quote}</blockquote>}
    <details><summary className="cursor-pointer">Attach or change CV evidence</summary>
      <label htmlFor={`${c.id}-page`}>Evidence page</label>
      <select id={`${c.id}-page`} value={page} onChange={e => setPage(Number(e.target.value))}>{source.pages.map(p => <option key={p.page} value={p.page}>{p.page}</option>)}</select>
      <label htmlFor={`${c.id}-quote`}>Exact CV passage</label>
      <textarea id={`${c.id}-quote`} value={quote} maxLength={20000} onChange={e => setQuote(e.target.value)} />
      <button type="button" className="border rounded-lg p-2" onClick={attach}>Attach evidence</button>
      {error && <p role="alert">{error}</p>}
    </details>
    <label htmlFor={`${c.id}-reason`}>Correction / attestation reason (required for facts outside the CV)</label>
    <textarea id={`${c.id}-reason`} maxLength={2000} value={c.correctionReason} onChange={e => change({ correctionReason: e.target.value })} />
    <div className="flex flex-wrap gap-3">
      <button type="button" className="border rounded-lg p-2" onClick={() => confirm('cv')}>Confirm against CV</button>
      <button type="button" className="border rounded-lg p-2" onClick={() => confirm('attestation')}>Record my attestation</button>
      <button type="button" className="border rounded-lg p-2" onClick={remove}>Remove claim</button>
    </div>
  </fieldset>;
}
