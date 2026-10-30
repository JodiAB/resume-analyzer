# JobPilot AI V1 — implementation design for review

23 October 2026. Status: proposed V1 design; stabilization implemented separately. Major V1 implementation is paused for review.

## Outcome and constraints

Extend JodiAB/resume-analyzer using React Router 7, React 19, Zustand and Puter.js. Keep existing analysis, resume listing, sign-in and resume review workflows. A candidate uploads a master CV, confirms evidence, discovers permitted job listings, inspects eligibility and fit, generates a role-specific CV/optional letter, reviews exact documents and answers, approves one immutable revision and completes the application manually. Tracking records what the candidate reports; opening a link does not mean an application was submitted.

Never invent credentials, skill proficiency, technologies, achievements, dates or employment duration. Never merge freelance and employment experience into inflated professional totals. Never expose CVs publicly, scrape unapproved websites, or submit an application automatically. No submission endpoint, browser form-filling agent, background application scheduler or employer API POST belongs in V1.

## Architecture decisions

The selected approach extends Puter rather than introducing a second identity/database. A server-owned identity and transactional database was considered; it adds a migration without evidence that it is required. Reconsider only if a reproducible isolation, retention, size or concurrency failure blocks acceptance and cannot be corrected within Puter. Document the failed criterion and review the smallest remedy first.

- **Browser:** authenticated private UI, CV extraction, profile confirmation, evidence-aware AI calls, matching, document export and manual review. Zustand holds transient session and editing state. No CV data in localStorage, analytics, URL query strings, SSR loader payloads or shared caches.
- **Puter:** existing identity, user/app-scoped FS and KV, existing account-funded AI gateway. The SDK and AI provider process personal data; explain this before uploading and generating. No client API keys. App-owned files use relative folders and private SDK reads, never public share/read links.
- **React Router server:** public job-feed GET adapters only, with configured ATS hosts/boards, bounded requests and shared caches containing exclusively public job data. No candidate data or Puter session is sent to job feeds. Public discovery does not need a second authentication system; rate/size limits prevent abuse.
- **Document generation:** client-only modules consuming a validated document AST, generating DOCX and PDF from the same content. Select the exact libraries during milestone 4 after compatibility/license checks; proposed `docx` and `pdf-lib` with a bundled licensed Unicode font. Export bytes stay in memory or private Puter FS. DOCX text and PDF text must match the approved content.

Puter's [storage documentation](https://docs.puter.com/recipes/store-files/) describes per-user app storage; its [upload API](https://docs.puter.com/FS/upload/) supports a destination directory and missing-parent creation. These are documented capabilities, not a substitute for testing this app with two real accounts.

## Storage model and ownership

All new records have `schemaVersion`, UUID, owner UUID, created/updated UTC timestamps and explicit evidence status. Owner fields detect mistakes; Puter permissions are the actual access-control boundary. Client fields cannot authorize server access. Validate records on every read and write, reject unknown shapes and preserve originals during schema upgrades.

| Data | Private storage/key | Content and lifecycle |
| --- | --- | --- |
| Legacy analyzer | `resume:<id>` | Existing valid records remain readable; invalid records are reported and retained. Stabilized new uploads use `jobpilot/resumes/<id>/` folders. |
| Source CV | `jobpilot/v1/cvs/<cvId>/master.pdf` plus `jp:v1:cv:<cvId>` | SHA-256, filename, byte size, page count, extraction version, source text/page spans; user can delete. |
| Candidate profile | `jp:v1:profile:<profileId>:<revisionId>` | Immutable profile revisions with source claim references and preferences. Mutable head pointer is a convenience, not evidence. |
| Shortlist | `jp:v1:shortlist:<source>:<jobId>` | User status and source snapshot/version; no CV stored with public feed cache. |
| Application | `jp:v1:application:<applicationId>` | Stable employer/source job identity and current revision pointer; one application per canonical source/job. |
| Application revision | `jp:v1:revision:<applicationId>:<revisionId>` | Content-addressed immutable manifest, profile/job versions, complete questions and answers, destination and artifact hashes. |
| Artifacts | `jobpilot/v1/applications/<applicationId>/<revisionId>/` | Exact CV DOCX/PDF, optional letter and review manifest; no overwrite of approved revisions. |
| Approval | `jp:v1:approval:<applicationId>:<revisionId>:<hash>` | All five review confirmations, revision hash, owner, timestamp. Any changed byte invalidates it. |
| Tracking events | `jp:v1:event:<applicationId>:<eventId>` | Append-only user-reported status changes, timestamp, optional private receipt/reference, source revision hash. |

KV multi-record writes are not assumed transactional or compare-and-swap capable. Write immutable artifacts/revisions first, verify hashes/readback, then update pointers. A pointer never confers approval. Use content-addressed retries, per-tab single-flight protection and a fresh remote read before committing decisions. Use the Web Locks API with `jobpilot:<owner>:<entityId>` for one editor across tabs on the same origin; fail closed for editing if the API is unavailable until a tested fallback exists. Across devices, use immutable revisions with `parentRevisionIds`: enumerate revisions rather than trusting a mutable head, compute all DAG leaves, and require an explicit merge/re-review when multiple leaves exist. Re-read leaves before approval and handoff. KV has no assumed global lock; a later concurrent branch can still appear, so invalidate the current review when detected and never claim global exactly-once guarantees. V1 never performs an external submission, so a client-side race cannot become an automated duplicate submission.

Data is retained until the user deletes it; do not promise unimplemented automatic expiry or provider-level erasure. Offer deletion by owned manifest paths only, preserve metadata on partial failures and report orphans. Unknown legacy files require manual cleanup. No broad root scan/delete or KV flush. Recovery journals must contain only private IDs and paths and must survive a lost response. Private caches clear immediately on sign-out/account change and object URLs are revoked.

## Security boundaries and failure policy

1. SDK readiness and verified session precede private reads/mutations. Stabilization rechecks SDK identity before every private operation and revalidates on focus/visibility changes without discarding same-owner forms. Session epochs discard stale auth/read results and prevent remaining transaction stages from running after account changes. Unmount private routes on logout. Refresh session on return to the app; test out-of-band SDK account changes. SDK checks are defense in depth, not service authorization.
2. The browser SDK is third-party code with access to displayed CV data. Restrict scripts/network destinations with a tested CSP; use no analytics on private routes. Do not use untrusted HTML from feeds or model output. Do not log SDK responses, CVs or screening answers. Generic UI errors avoid leaking provider payloads.
3. PDF and DOCX inputs are untrusted. Enforce size/page/text/pixel bounds, reject encrypted or malformed files clearly, provide reviewed OCR fallback for scans, and release workers/canvas resources. No silent empty-profile success.
4. Feed requests accept a configured board identifier, never arbitrary URLs. Allowlist HTTPS hosts, reject private-network destinations and redirects outside the allowlist, sanitize returned source/application links, and cap response size, pagination, redirects and duration. HTML becomes inert text.
5. Every model response is untrusted. Treat CV/job text as data, not instructions; validate JSON schemas and bind each generated claim to confirmed evidence. A model must not update the verified profile or approval state. Schema correctness alone does not establish factual accuracy.
6. Reads may retry transient failures with a maximum of three attempts and jittered backoff, respecting `Retry-After`. Auth errors and invalid schemas do not retry automatically. AI retries are explicit because they may cost money. Mutations use stable IDs and reconciliation after ambiguous outcomes, never blind replay. Timeouts cannot guarantee cancellation of a remote SDK write.
7. Approval records are user review receipts in V1, not tamper-proof signatures against a malicious account owner. Any future submission service requires server-verified Puter identity, owner authorization, durable idempotency, authenticated integrity checks and official submission methods. It requires a separate design/review.

## Milestones and acceptance gates

Each milestone starts with failing tests where practical, passes unit/component/integration checks plus `npm run typecheck` and `npm run build`, and is reviewed before the next milestone starts. Do not mark a milestone complete solely because mocked tests pass. Distinguish implemented, locally verified and live-service verified.

### 0 — existing application stabilization (current work)

Fix six compiler errors, recover uploads with form state preserved, validate AI/legacy records, delay private effects until auth readiness, discard stale results, scope deletion to owned paths and await operations. Keep analyzer and valid historical records usable.

Acceptance: regression tests reproduce failures before fixes and pass afterwards; build/typecheck pass; malformed feedback never becomes a successful record; sign-out hides private state; no root deletion/KV flush; failed deletes retain metadata. Real two-account Puter isolation, live model and PDF worker compatibility remain explicit integration gates.

### 1 — verified candidate profile

Suggested modules: `app/features/profile/{schema,extract,verify,repository}.ts`, `app/routes/profile.tsx`.

Extract all pages and store evidence spans `{cvHash,page,start,end,quote}`. Claims contain value, kind, source, confirmation status/time and candidate corrections. Separate `employment[]` and `freelance[]`, exact start/end dates, current roles, skills/proficiency, project evidence URLs and achievements. Store titles, allowed locations/work authorization, salary currency/period/range and weekly availability with IANA timezone as explicit preferences, never inferred facts.

Compute employment tenure from the union of confirmed employment intervals, without double-counting overlap or adding freelance time. Missing/partial dates produce ranges/uncertainty, not invented exact years. Candidate attestation is labeled as such, not independently verified employment. External portfolio links are evidence references, not permission to scrape them.

Acceptance/tests: complete multi-page extraction; scans/encryption/empty/oversized input; source-span/hash integrity; correction invalidates dependent drafts; overlapping jobs, date precision, current dates and freelance separation; no unsupported skill/date accepted into verified generation; account B cannot read A's CV/profile and signed-out access fails at the service.

### 2 — permitted job discovery

Suggested modules: `app/features/jobs/{schema,normalize,repository}.ts`, server-only `adapters/{greenhouse,lever}.server.ts`, React Router resource route `api.jobs.ts` and UI `jobs.tsx`. Confirm current official API documentation, terms and permitted access for each source before enabling it. Do not assume every ATS board authorizes use. Initial feeds are configured public employer boards, with optional licensed feeds later.

Persist source/job IDs, source/application URLs, complete description snapshot/hash, published/updated/fetched UTC times, salary currency/period/range, remote/location restrictions, work authorization and hours evidence. Each inferred field includes quote/source and `unverified` status. Prioritize published within seven rolling days, React/Next.js/TypeScript/Node.js and frontend/full-stack/AI application roles. Updates are not publication dates; missing publication dates are unknown.

Acceptance/tests: fixtures and live permitted-board smoke; pagination, duplicate updates, 429/Retry-After, timeouts, malformed/oversized bodies, source disappearance, future/unknown dates, hostile HTML/URLs and SSRF attempts. No candidate content in server logs or feed requests. South Africa and time overlap are evidence requirements, not assumptions from the word remote.

### 3 — qualification matching

Suggested modules: `app/features/matching/{eligibility,score,explain}.ts`, job-detail UI. First evaluate mandatory criteria as `pass | fail | unknown`: country/work authorization, required credentials/experience, onsite obligations and explicit non-negotiable salary/hours. Fail blocks eligibility; unknown requires resolution and is not presented as eligible. Missing nonmandatory evidence stays unknown.

Only after the mandatory gate, calculate a labeled fit estimate. Proposed initial weights (versioned and reviewable): technical skills 30, employment experience 20, seniority 10, portfolio 15, remote eligibility 10, salary 10, hours 5. Report each component's evidence, gaps and confidence. Unknown components earn no confirmed points; show a possible score range without silently reweighting. Never label a fit score as a hiring probability.

Acceptance/tests: mandatory fail cannot be rescued by technical points; unknown eligibility cannot be silently passed; professional/freelance distinction; seniority not inferred solely from titles; portfolio evidence only; salary missing/currency/period mismatches; explicit conversion provenance if used; DST/date-aware UK/Europe/US Eastern overlap against Africa/Johannesburg; deterministic explanations and score-version reproducibility.

### 4 — AI-generated role-specific CVs and documents

Suggested modules: `app/features/documents/{schema,generate,validate,render-docx,render-pdf,diff}.ts`, draft-review UI. AI receives the full selected job snapshot and only candidate-confirmed evidence. Generate a structured AST with evidence IDs for every statement. Allow AI to suggest wording and select/reorder relevant claims. Reject new technology/qualification/date/number/metric or inflated duration; use conservative verbatim fallbacks and show unsupported requests. Do not let AI create proof by citing an unrelated claim ID.

The review screen displays master-to-tailored changes, excluded content and keyword gaps. Optional cover letters and screening answers use the same restrictions; sensitive questions require the candidate's explicit answer. Salary/preferences do not automatically become claims about prior employment. Candidate edits cannot bypass validation by labeling invented text verified; new facts must first be confirmed in a new profile revision with evidence or clearly labeled candidate attestation.

Acceptance/tests: adversarial job prompt injection, hallucinated skills, changed quantities/dates, inappropriate claim references, overlapping/freelance experience and unsupported keyword requests; deterministic artifact generation; DOCX XML and PDF text compared against the AST; multipage/Unicode/long lines; visual rendering review of every fixture template; editable DOCX and readable PDF; generation failures do not mark documents ready. Human review remains mandatory even after automated checks.

### 5 — explicit approval and manual handoff

Suggested modules: `app/features/applications/{revision,approval,handoff,repository}.ts`, `app/routes/applications.tsx`.

Every application starts draft. Freeze a canonical JSON manifest with employer/job snapshot, final CV artifact hashes, optional letter or explicit omission, complete questions/answers and exact HTTPS destination. Hash canonical UTF-8 bytes and all artifacts with SHA-256. Require separate confirmation of all five approval categories and a final approval action tied to this manifest hash. Recompute and validate before handoff. An edit forks a revision and clears approval; cached/old approval never enables the new one.

Manual handoff is a user-initiated destination link plus the approved download bundle/checklist. Destination navigation never uploads documents or posts data. If destination/job content changes, require re-review. The user completes the employer form and confirms the outcome manually. Provide no unsupported official submission adapter in V1.

Acceptance/tests: changed CV byte, letter, answer, employer/job or URL invalidates approval; omitted category blocks approval; stale/cross-owner/forged approval rejected in normal app flows; concurrent revision conflict requires resolution; unsafe destination blocked; double click makes one local action; no employer POST/automation in network tests; opening handoff retains truthful status `handoff_opened`, not `submitted`.

### 6 — application tracking

Reuse the application shell with per-job history and statuses: `draft`, `ready_for_review`, `approved`, `handoff_opened`, `submitted_manually`, `interview`, `offer`, `rejected`, `withdrawn`, `closed`. Record every user-reported transition and its time; do not silently infer outcomes. Show applied-before warnings across duplicate source aliases using a reviewed canonical employer/job URL mapping; ambiguous duplicates require review rather than automatic merging.

Acceptance/tests: duplicate draft creation and source aliases; submitted job warning survives reload; rejected/withdrawn status history; ambiguous save reconciliation, partial failure and multi-tab conflicts; user A/B isolation; no automatic employer contact; status does not disappear when a feed listing closes. Export/delete only the signed-in user's history.

## Review and production readiness

Before starting milestone 1, review this design and the stabilization evidence. Before production acceptance, run two-account service access tests with synthetic private documents, live permitted-feed tests, actual Puter auth/model tests, real PDF upload/export rendering and end-to-end browser flows. Use test accounts and synthetic data; never publish personal CV fixtures.

Outstanding risks are gates, not justification for a speculative migration: real Puter access controls/app identity across deployment origins, SDK/model availability, out-of-band account switches, nontransactional KV concurrency, partial writes/orphans, provider retention and third-party script exposure. Existing public sample resume assets have unverified provenance and must be replaced with synthetic samples or removed before a privacy-approved release. Verify dependency vulnerabilities, Node/runtime compatibility and deployment headers separately. No claim of production security or V1 completion is made by this design.
