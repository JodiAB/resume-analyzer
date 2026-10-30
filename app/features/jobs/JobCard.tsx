import { evaluateJob } from './eligibility';
import type { SearchPreferences } from './preferences';
import type { Review, TrackedJob } from './model';
import {Link} from 'react-router';
import type {Assessment} from '../matching/types';
export default function JobCard({ record: t, preferences, review, recheck,assessment }: { record: TrackedJob; preferences: SearchPreferences; review: (state: Review) => void; recheck: () => void;assessment?:Assessment }) {
  const j=t.job; const e=evaluateJob(j,preferences,new Date().toISOString());
  return <article className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-3 min-w-0" aria-label={`${j.employer}: ${j.title}`}>
    <div className="flex flex-wrap gap-2 justify-between"><p className="font-semibold">{j.employer}</p><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{e.status}</span></div>
    <h2 className="text-2xl! break-words">{j.title}</h2><p className="break-all">{j.source} · {j.board} · {j.sourceId}</p>
    <Link className="underline text-indigo-700" to={`/match/${encodeURIComponent(j.source)}/${encodeURIComponent(j.board)}/${encodeURIComponent(j.sourceId)}`}>Assess qualifications</Link>
    {t.review==='SHORTLISTED'&&<Link className="underline" to={`/prepare?job=${encodeURIComponent(j.key)}`}>Prepare documents</Link>}
    {assessment?<p>Qualification: {assessment.score}/100 · {assessment.confidence} confidence · {assessment.eligibility} · {assessment.recommendation}. {assessment.band}. Evidence coverage, not a hiring probability.</p>:<p>Qualifications: unassessed or stale — reanalysis required.</p>}
    <dl className="grid sm:grid-cols-2 gap-2 text-sm"><div><dt className="font-semibold">Eligibility for South Africa</dt><dd>{e.saEligibility}</dd></div><div><dt className="font-semibold">Review</dt><dd>{t.review}</dd></div><div><dt className="font-semibold">Remote restrictions</dt><dd>{j.remote} · {j.locations.join('; ') || 'Location unknown'}</dd></div><div><dt className="font-semibold">Employment / seniority</dt><dd>{j.employmentType||'Unknown type'} · {j.seniority||'Unknown seniority'}</dd></div><div><dt className="font-semibold">Date posted</dt><dd>{j.publishedAt||'UNKNOWN'}{j.publicationKind==='LAST_PUBLISHED'?' (last published; may be a republication)':j.publicationKind==='FIRST_PUBLISHED'?' (first published)':''}</dd></div><div><dt className="font-semibold">Updated</dt><dd>{j.updatedAt||'UNKNOWN'}</dd></div><div><dt className="font-semibold">Source checked</dt><dd>{j.checkedAt}</dd></div><div><dt className="font-semibold">Application availability</dt><dd>{j.availability} — public listing only; submission was not tested</dd></div><div><dt className="font-semibold">Salary</dt><dd>{j.salary.length?j.salary.map(s=>`${s.min}–${s.max} ${s.currency}/${s.period}`).join('; '):'Undisclosed / unverified'}{j.salaryNotes && ` · ${j.salaryNotes}`}</dd></div><div><dt className="font-semibold">Employer headquarters</dt><dd>{j.employerCountry||'UNKNOWN — not inferred from job location'}</dd></div></dl>
    <ul className="list-disc pl-5">{e.reasons.map(r=><li key={r}>{r}</li>)}</ul>
    {e.evidence.length>0&&<blockquote className="border-l-4 border-blue-200 pl-3 whitespace-pre-wrap">Eligibility evidence: {e.evidence.join('\n')}</blockquote>}
    <p className="text-sm">Skills mentioned (requirement level unverified): {j.skills.join(', ')||'Not identified'}</p>
    <details><summary className="cursor-pointer font-semibold">Full job description</summary><p className="whitespace-pre-wrap break-words mt-3">{j.description||'No description supplied. Import the employer description for manual review.'}</p></details>
    {j.url&&<p className="break-all">Original employer source URL: {j.url}. Application navigation is available only through an approved package.</p>}
    <div className="flex flex-wrap gap-2">{([['SAVED','Save'],['SHORTLISTED','Shortlist'],['DISMISSED','Dismiss']] as const).map(([state,label])=><button key={state} type="button" className="border rounded-lg px-3 py-2" onClick={()=>review(state)}>{label}</button>)}
      {j.source!=='manual'&&<button type="button" className="border rounded-lg px-3 py-2" onClick={recheck}>Recheck source</button>}
    </div>
  </article>;
}
