# Milestone 3 — Evidence-based qualification matching

28 October 2026. Controlled local development only. Full live account isolation remains **OPEN / NOT PASS**. No push, deployment, tailoring, automatic application or external submission was performed. Stop for review before Milestone 4.

## Implemented flow

Open the main application `/jobs` route, choose **Assess qualifications**, inspect the private candidate/job evidence and settings, and choose **Analyze evidence**. The screen shows deterministic eligibility before the score, a six-component explanation, confidence/coverage, required versus preferred gaps, seniority expectations, separate salary/hours constraints, source quotes/pages/spans and timestamps. Shortlist/dismiss uses existing discovery events and preserves deduplication/review history. Dashboard summaries support score sorting and recommendation filtering; unassessed/stale jobs have no implied score.

Optional **Analyze with Puter AI** requires explicit consent to the previewed excerpts and potential cost. Only bounded confirmed labels and job text are sent to Puter, never to job feeds. Schema-validated AI links appear as unscored suggestions. No tool/action capability or free-form factual explanation is accepted. The UI binds consent to the exact profile/job/preferences/settings snapshot; changed previews are rejected before chat. No paid model call was made during verification.

## Rules and interpretation

Eligibility is ELIGIBLE / INELIGIBLE / UNKNOWN. South African eligibility, workplace, current source availability, employment type, authorization, required skills/qualifications/experience/tasks and seniority are evaluated before scoring. Explicit disqualification blocks recommendations regardless of score. Missing/ambiguous requirements stay UNKNOWN and manual review. Known and unknown technology mixtures, inherited mandatory sections, mixed required/preferred clauses and unsupported numeric-experience topics remain unresolved. This is a bounded English parser, not a complete legal/employer interpretation system; the source description remains available for review.

Default rubric: technical skills35, relevant experience25, project relevance15, seniority10, responsibilities/domain10, preferred secondary credentials5. Editable weights must total100; ordered thresholds default90/80/70. Required technical criteria count twice preferred ones within their component. Missing or unstated criteria retain zero points and reduce coverage; points are not silently redistributed. A role without an explicit numeric experience criterion therefore earns no duration points. Scores measure documented evidence, never hiring/interview probability. HIGH confidence means >=80 weighted evidence coverage, MEDIUM >=50, otherwise LOW; unknown eligibility caps confidence at LOW. Required salary/hours conflicts block recommendation; required unknown constraints force manual review. Employer-mandatory overlap is enforced even without the candidate's mandatory-hours checkbox.

Confirmed CV-backed claims only earn verified points. Attested/unconfirmed claims do not. Commercial employment, explicitly paid freelance work, independent projects and education/certifications remain distinct. Professional duration unions commercial plus paid freelance intervals; hands-on duration may include project evidence. Overlapping dates are unioned, with full-month lower bounds and touched-month upper bounds. Missing/partial dates stay uncertain. Topic-specific years require positive evidence for each technology; negated technology never counts toward duration. Years never imply seniority. Candidate gap/history/authorization declarations are labeled self-attestations, not invented CV facts. CV confirmation is not independent employment or credential verification.

Transfer map (half credit, never a mandatory exact-skill pass): React from Vue/Angular; Next.js from React; TypeScript from JavaScript and vice versa; Node.js from Express; PostgreSQL from SQL. Literal aliases are bounded by the catalog in `requirements.ts`. AI can suggest other CONTEXT links for human review but cannot create scored facts or override eligibility. Source disagreement lowers confidence/recommendation rather than silently selecting an answer.

Salary comparisons require disclosed same-currency ranges; month/year conversion only, no FX/hourly inference. Missing/crossing bands stay UNKNOWN. Hours require explicit supported IANA windows and candidate hours, evaluated over the next seven dates with weekday/DST rules. Ambiguous abbreviations, absent/invalid/overnight windows stay UNKNOWN; this is not a year-round overlap guarantee.

## Persistence and security boundaries

No authentication or storage migration. Private immutable Puter KV keys are `jp:v1:match:<owner>:<id>`. Records bind owner, exact profile revision/hash, job hash, preferences hash, rubric/config hash, analysis time and model provenance. Scores are recomputed from validated current sources, never trusted from a stored/model-supplied number. Records expire after24h or a UTC date change. Focus/timer refresh clears stale displayed results. Route-key remounts and load generations prevent obsolete route/focus work from replacing newer evidence. Dashboard summaries compare fresh stored job snapshots, not merely old component props.

Existing guarded SDK wrappers and captured session checks apply before/after identity-dependent async work. AI completion, readback and persistence recheck identity/context. Web Locks are required for saves. Exact immutable readback reconciles a lost receipt; uncertain saves permit retry of that same record without another model call. Capacity is bounded to200 records /100k characters each /5m total; no history deletion or blind retry. Cross-device concurrent writes and new KV service isolation have not been live-certified. AI records retain short evidence labels privately; no new full CV/document storage, public links or candidate localStorage is introduced.

## Verification

| Status | Check | Observed result |
|---|---|---|
| Verified PASS | Full standalone regression | 291/291 passed, 0 failed, 0 pending; all228 baseline cases preserved by filename + full test name |
| Verified PASS | New focused matching tests | 63: domain26, constraints5, semantic10, service/repository14, UI8 |
| Verified PASS | TypeScript / React Router type generation | `npm run typecheck`, exit0 |
| Verified PASS | Production client + SSR build | `npm run build`, exit0;121 client modules /60 server modules |
| Verified PASS | SSR | 8 routes including private matching loading shell; no candidate serialization |
| Verified PASS | Real loopback HTTP | 16 checks: control,8 pages,2 static assets,3 private sample404s, API arbitrary-URL400 and POST405 |
| Verified PASS | Production Chrome acceptance | 10 matching +12 discovery +9 profile =31 scenarios; zero uncaught page errors |
| Verified FAIL, repaired | Development repros | Unsupported/mixed/inherited required clauses, unknown/negated experience, mandatory tasks, stale preview/job snapshots, UI labeling and preview TypeScript union: fixed and regression-checked |
| Verified FAIL, superseded | Concurrent full-suite attempt | PDF setup hook timed out;281 passed,10 unexecuted. Unchanged standalone rerun passed291/291; no timeout increase or skips |
| BLOCKED by restricted environment, resolved for local checks | Loopback/Chrome execution boundary | Approved local execution used; actual HTTP/browser checks passed. This does not approve deployment |
| NOT TESTED / release blocker | Full live isolation | Reverse raw access, genuine network-in-flight switches, new KV namespaces and production origin |
| NOT TESTED | Live paid semantic model | Controlled schema fixtures only; no live model cost or service accuracy claim |

Final results and regression comparison are recorded in task outputs `milestone-3-tests.json` and `milestone-3-regression-comparison.json`. Browser evidence is `milestone-3-browser.json`, `milestone-2-browser.json` and `milestone-1-browser.json`; desktop/mobile screenshots are `milestone-3-assessment*.png`. Final baseline comparison:228 preserved,0 missing. The report in task outputs is a copy of this document.

Reproduce from `work/resume-analyzer` with Node24:

```powershell
npm test -- --reporter=json --outputFile=../../outputs/milestone-3-tests.json
npm run typecheck
npm run build
node scripts/ssr-smoke.mjs
node scripts/http-smoke.mjs
$env:JOBPILOT_PLAYWRIGHT_MODULE='<PLAYWRIGHT_MODULE_PATH>/index.mjs'
$env:JOBPILOT_BROWSER_EXECUTABLE='C:/Program Files/Google/Chrome/Application/chrome.exe'
node scripts/matching-browser-smoke.mjs
node scripts/jobs-browser-smoke.mjs
node scripts/profile-browser-smoke.mjs
```

Run the native PDF suite separately from resource-heavy browser/build work. One concurrent run hit the unchanged PDF beforeAll10000ms limit, leaving10 tests unexecuted; its evidence is retained in `milestone-3-pdf-hook-timeout.json`. No assertion failed in that run, but it was not a pass. No timeout was increased and no test was skipped to mask it. Final standalone suite results supersede that attempt. Restricted sandbox loopback requires approved local execution; SSR/HTTP/Chrome actually ran, rather than being inferred from build success.

Chrome acceptance uses actual production routes/server and synthetic Puter/model fixtures, not real Puter account isolation. Ten new scenarios: discovered-job selection and deterministic scoring; source inspection; dashboard sort/filter and shortlist; explicit AI consent and structured mappings; setting invalidation; invalid AI eligibility injection rejection; profile invalidation; desktop/mobile layout; controlled account change during AI; no candidate feed calls/localStorage/uncaught errors. Existing12 discovery and9 profile browser scenarios were repeated. Profile browser uses real PDF.js extraction and recovery, synthetic private SDK transport.

Tests include exact/transfer skills, missing credentials, seniority, duration unions/categories/bounds, ineligible high scores, unknown authorization, sparse/unsupported/mixed source clauses, malformed/injected/refused/truncated AI, source disagreement, owner/read/write/account changes, immutable/lost/ambiguous save receipts, profile/source/preview invalidation and private UI boundaries. Fresh code review supplied concrete false-pass repros; regressions were observed failing and then fixed. Initial UI accessible-label mismatch and TypeScript preview union error were repaired before final checks.

## Release blockers and not tested

- Full live isolation remains OPEN: reverse-direction A-to-B raw access; account switches while bytes/RPCs are genuinely in flight; deployment origin/app identity; live private profile/discovery/matching KV ownership. Controlled mocks and delayed-consumer tests are not proof of those service guarantees.
- Live paid Puter structured-output/model behavior and semantic accuracy: NOT TESTED. Controlled responses only. Client validation fails closed if the provider refuses or ignores the requested format. Puter test mode from stabilization is not live semantic matching evidence.
- Restricted requirement catalog, conservative residual parsing, language nuance and contradictory source text still require human review. ELIGIBLE describes supported observed conditions, not an employer guarantee or legal authorization decision. No proficiency equivalence or hidden experience is inferred.
- No overnight-hour solver, FX conversion, cross-device concurrency certification, match-history deletion UI or capacity migration. Large profiles/jobs may exceed semantic limits and require deterministic/manual analysis. Existing Docker Node20 setup has not been validated; verified local runtime is Node24.
- No public release security approval, new dependency vulnerability certification, real personal-document test, automatic submission, CV tailoring or Milestone4 implementation.

## Changed files for this milestone

New `app/features/matching/`: `types.ts`, `requirements.ts`, `experience.ts`, `constraints.ts`, `engine.ts`, `semantic.ts`, `bindings.ts`, `repository.ts`, `service.ts`, `useSummaries.ts`. New route `app/routes/match.tsx`; new fixture `tests/fixtures/matching.ts`; five `tests/matching-*.test.*` suites; new `scripts/matching-browser-smoke.mjs` and this report/design plan.

Modified `app/routes.ts`, `app/routes/jobs.tsx`, `app/features/jobs/JobCard.tsx`, `app/features/jobs/eligibility.ts` (authorization jurisdiction matching), `app/lib/validation.ts` (safe return route), `types/puter.d.ts` (documented structured-output options), `scripts/ssr-smoke.mjs`, `scripts/http-smoke.mjs`, `README.md`, `docs/verification-gate.md`. Earlier staged/untracked stabilization/M1/M2 changes were retained; no reset, commit, push or deployment.
