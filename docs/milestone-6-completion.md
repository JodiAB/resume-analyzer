# Milestone 6 release-readiness assessment

30 October 2026. **Release remains BLOCKED.** Controlled synthetic local acceptance passed; this is not approval to use real personal documents or deploy. No confirmed cross-account disclosure was observed in the supplied live checks, but the full live security gate is still OPEN / NOT PASS. No push, deployment, email, automated application or real submission occurred. Stop for review; no unrelated feature development started.

## Readiness decisions

| Category | Decision | Basis |
|---|---|---|
| Personal local use with real CV data | BLOCKED | Outstanding genuine in-flight account-switch/late-write verification and native DOCX layout; three unresolved development dependency findings. Synthetic-only controlled testing can continue. |
| Private deployment | BLOCKED | Deployment origin/Puter app identity and permissions, HTTPS/security headers and live isolation on that exact origin have not been certified. No deployment was attempted. |
| Public multi-user release | BLOCKED | Requires complete service/operation isolation, deployment hardening, native document acceptance and reviewed dependency/tooling remediation. Snapshot denials cannot establish a universal privacy guarantee. |
| Controlled synthetic local acceptance | PASS | Automated, production-browser, public-feed and bounded user-assisted checks below; all limits remain explicit. |
| Configured-board coverage for recent, verified SA international roles | FAIL | Only three employer boards; zero fully verified recent South African remote matches in this live sample. This is a coverage/utility finding, not a privacy disclosure. |

## 1. Complete verification results

| Verification | Actual result | Task outputs evidence |
|---|---|---|
| Full automated suite | 395/395 passing;44 test files;0 failed/pending | milestone-6-tests.json / .log |
| Baseline preservation | All377 baseline file/test-name pairs still pass;18 additions | milestone-6-regression-comparison.json |
| TypeScript | Exit0 | milestone-6-typecheck.log |
| Production build | Exit0 | milestone-6-build.log |
| SSR | 10 routes pass, private loading shells only | milestone-6-ssr.log |
| HTTP | 23 checks pass: all18 original plus5 verification/fixture exclusions | milestone-6-http.log |
| Prior browser regressions | 55 pass: profile9, discovery12, matching10, preparation11, applications13 | milestone-6-regression-{profile,jobs,matching,preparation,applications}.json |
| Continuous public-description journey | 16 checks pass, including uploaded synthetic PDF and source-backed CV revision | milestone-6-journey-browser.json / milestone-6-journey.log |
| Approved files | Four actual journey CV/cover PDF/DOCX downloads match immutable approved hashes | milestone-6-journey-approved-*; journey JSON manifests |
| Document text/structure | Short CV1 PDF page/23 DOCX paragraphs; long CV5 pages/47 paragraphs; cover1 page/13 paragraphs; complete text equivalence | milestone-6-short-document-qa.json; milestone-6-native-document-qa.json; milestone-6-docx-structure.log |
| Journey document accuracy | CV/cover DOCX paragraphs also appear in corresponding selectable PDFs; dates/categories retained | milestone-6-journey-document-qa.json |
| Extra harness regressions | Setup/session repair, repeated approved setup, aborted-read labeling, dispatch classification, audit false-write detection and recovery/cleanup checks pass with synthetic SDKs | milestone-6-harness-final.log, harness-negative.log, *audit-browser.json, recovery-browser.json |

The machine summary is milestone-6-verification-summary.json. Automated browser SDKs and model responses are explicitly controlled. They are not live service isolation proof. Original M1–M5 outputs were archived in outputs/archive-before-milestone-6 before repeating browser scripts. Existing accepted staged/unstaged work was preserved; no commit/reset/stash was performed.

## 2. Live two-account evidence and its limits

Run: `944582de-c134-4cd4-afb7-330a8266dd6b`. Evidence was returned by the user from their normal browser, not independently captured from a live SDK by this agent. See milestone-6-user-assisted-live-evidence.json for selected facts/transcription and exact timestamps. No passwords, authentication tokens, session cookies, SDK account identifiers or private file paths were requested/exported.

**Verified PASS within this synthetic run:** distinct SDK identities; both A→B and B→A raw reads of profile, discovery, matching, preparation and application keys returned absent/denied; raw foreign PDF reads/deletes were denied; app foreign reads were blocked; both owners subsequently verified their exact original keys and PDF bytes unchanged. Owner repository loaders also accepted their own records. This includes read and deletion-isolation evidence in both directions, rather than an inference from mocks.

**Stale-consumer rejection PASS:** generation, approval validation/persistence and approved-document preparation returned session rejection after sign-out. This proves those observed stale-result guards, not that the other account was already authenticated while actual network traffic or rendering remained active.

**BLOCKED:** read-switch attempt returned `subject_does_not_exist`; upload-switch attempt returned `field_invalid`. These were not relabeled as passes. The original PDF survived the read attempt. Later bounded auxiliary-directory snapshots contained zero recognized or unverified entries under either account. Those snapshots do not prove every possible late write, and the SDK upload error cause remains unresolved. Official Puter documentation supports both File and Blob arrays, so an unsupported-Blob conclusion was not invented from this error: https://docs.puter.com/FS/upload/.

**Historical overlap classification corrected:** the old harness exported approval-write RPC overlap PASS. Review found its initial dispatch timestamp could also represent work that failed before calling the target SDK method. The historical overlap is therefore **UNVERIFIED**, not counted as a verified RPC or wire overlap. The corrected tool requires recorded target invocation and stamps synchronous failures as settled; its regression observed failure before the fix and passed afterward. The user did not rerun that repaired instrumentation live. Every wire-in-flight case remains NOT TESTED.

Post-race snapshots: B at2026-10-29T15:44Z was DRAFT/CREATE1 and A at15:46Z was READY_FOR_REVIEW with3 events, with no foreign/ambiguous records and no saved APPROVE in either snapshot. Later deliberate synthetic approvals and a repeated setup produced A's eventual APPROVED7 history. The user-selected B label once accompanied A-like data; a fresh explicit B sign-in returned B's original DRAFT/CREATE1. A/B dropdown labels were never treated as authentication. This ambiguous intermediate result is not a confirmed disclosure.

Final Oct30 audits found A APPROVED7 and B DRAFT1, with zero foreign-owned/ambiguous records. Read-only recovery then independently checked alias-specific PDF hashes, SDK ownership, all five repository schemas, exact run scope and empty auxiliary directories. User-confirmed cleanup removed B6 keys+original PDF; A subsequently remained intact and cleanup removed A12 keys+original PDF. Absence of each captured target was reread/confirmed. Empty directories were not recursively deleted. No assertion was made that all unrelated account storage was wiped.

**Still NOT TESTED:** actual request/byte lifecycle overlap, reverse-direction live operation races, active auxiliary-deletion race, physical browser-transfer cancellation, future late writes beyond snapshots, and isolation on a deployed origin. Full live isolation remains OPEN.

## 3. Security findings and verified repairs

- **Production URL compatibility defect repaired:** real Greenhouse URLs included a redundant `gh_jid` equal to the path vacancy ID. Strict handoff previously blocked these. Only a single exact matching parameter is removed; mismatched/repeated IDs, arbitrary queries, altered vacancy paths and malicious hosts remain blocked. A real URL regression failed first, then passed; live original page GET passed after repair. Source URL evidence remains preserved.
- **Verification harness session defect repaired:** setup persisted a revision then refreshed identity while retaining the old captured service. The guard correctly rejected READY and left DRAFT. Fresh services are now acquired after revalidation; repeated READY/APPROVED setup is side-effect free and cannot silently invalidate an existing approval. Two focused tests and actual synthetic browser setup/approval repetition pass. A separate repair page safely completed the historical live setup without overwriting its original tab.
- **Verification evidence labels repaired:** deletion-survival labels now require an observed delete invocation, not merely entry into an access-test phase. A synthetic early-read-abort test proves no deletion-survival result is invented. Dispatch recording was separately repaired as described above; historical raw results remain distinguishable.
- **Refresh recovery gap addressed for cleanup:** the old harness lost its in-memory run/alias/path map on reload. A separate owner-bound recovery tool reconstructs exact targets read-only, checks the original PDF marker/hash, and requires separate explicit cleanup intent. Wrong alias/account, modified values/hash or unrelated history fail closed. Three unit regressions and an isolated browser recovery/cleanup test pass; both live cleanups were confirmed by the user.

No further actionable defect was found in these repairs by the fresh independent read-only reviewer. No authentication or storage migration, Next.js replacement, or new application submission mechanism was introduced. Owner-scoped Puter storage and all existing source/revision approval guards remain in place. No verified new public document exposure: five additional production HTTP checks return404 for verification pages/source and synthetic fixtures. Npm audit does not certify the remotely delivered SDK or production hosting permissions.

## 4. Dependency security audit

All30 original vulnerable package entries are documented individually in docs/milestone-6-dependency-audit.md and outputs/milestone-6-dependency-ledger.json. Each entry records affected range/advisory links, installed before/after versions, direct/transitive status, production/development graph exposure, application-specific exploitability analysis, safe remediation and residual risk. Aggregate package entries and individual advisories are distinguished.

Before:8 critical,18 high,3 moderate,1 low. After: **2 critical,1 moderate**, all in the development graph: `tinypool`, `vitest` and `@vitest/mocker`. `npm audit --omit=dev --json` reports **zero** current production-graph advisories. This is a registry snapshot, not a proof of exploit impossibility.

Direct updates remained within existing majors: Router/node/serve/dev/dom7.7.0→7.18.5; Vite6.3.5→6.4.5; Vitest3.2.4→3.2.7. Unrelated direct package versions were held at existing installed versions during isolated resolution. Compatible parent packages selected their own transitive versions; no forced incompatible override or direct major migration was used. Exact graph changes, including transitive major changes, are in milestone-6-dependency-changes.json.

An initial targeted update left the old mutually pinned Router family. Two normal incremental resolutions failed ERESOLVE; a separate manifest resolution with unrelated direct versions pinned succeeded, followed by normal npm ci without force/legacy-peer-deps. Full regression was run after changes. The remaining Vitest proposal is a direct major upgrade; it was not applied automatically. Development/mock-server findings are retained even though tests use vitest run and do not expose a public UI. Use trusted local tooling only pending a reviewed migration.

## 5. Native documents

**BLOCKED by environment:** no Word/LibreOffice/OnlyOffice executable was found in checked PATH/standard locations; no connected Word session was available. Evidence: milestone-6-native-viewer-check.json. No viewer was downloaded/installed automatically.

Actual renderer output was checked independently: every DOCX paragraph appears in matching selectable PDF, zero tables, Title/Heading1 structure, consistent Noto Sans declarations, A4 dimensions and0.75-inch margins. All seven native-fixture PDF pages and both journey PDF pages were visually inspected; no clipping or missing final text was observed. This is PDF/structural acceptance, not native Word pagination evidence or a guarantee for every employer ATS.

**Manual acceptance:** docs/milestone-6-native-acceptance.md gives exact short CV, long CV and cover filenames, viewer/version reporting, all-page layout/margin/heading/font/date/contact/reading-order checks and PDF comparison. Current templates use plain paragraphs, so native bullet-list appearance is N/A; no invented bullet-format PASS. Native visual QA remains blocked until those results are returned.

## 6. Live public-provider acceptance

Documented public GETs only: [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html), [Lever Postings API](https://github.com/lever/postings-api), [Ashby public postings API](https://developers.ashbyhq.com/docs/public-job-posting-api). No restricted-platform scraping, access-control bypass or candidate data was sent to feeds.

| Configured employer board | Final live result | Freshness / salary / links |
|---|---|---|
| Greenhouse / greenhouse | PASS,18 listings; current individual recheck and original page200 |0 within7 days; first-published retained;0 structured salaries in list snapshot. Repaired matching gh_jid normalized safely. |
| Lever / lever | PASS API200,0 listings on retry | First attempt SOURCE_TIMEOUT preserved. No active listing/date/salary/application-link claim can be made from an empty board. |
| Ashby / Ashby | PASS,71 listed remote records; individual recheck and original page200 |6 within7 days by last-published field, which may be republication;71 structured salary records. No SA eligibility inferred merely from Remote/EMEA. |

Final sample89 listings;30 technical remote roles not explicitly excluded by the discovery heuristic; **zero fully verified recent SA-eligible matches**. Default catalog is three employers, not a comprehensive international market. Meaningful verified target coverage is FAIL in this sample; expanding reviewed public boards is follow-up work, not silently added during acceptance.

Duplicate normalization was stable across repeated snapshots. Known nonexistent IDs returned missing, but they were deliberately synthetic absence probes: **a previously observed genuinely expired live vacancy was NOT TESTED**. Deterministic closure/outage tests preserve that distinction. Original live failure evidence is milestone-6-live-providers-first-attempt.json; final requests/public snapshots are milestone-6-live-providers.json / live-jobs.json.

## 7. Full journey and negative testing

The continuous production-browser script scripts/release-journey-browser.mjs uploaded a real two-page synthetic PDF, extracted/confirmed the profile and preferences, discovered replayed normalized records captured from the live public feed, applied original dates/country filters, assessed and manually shortlisted the actual Ashby Product Support Engineer–EMEA description. SA eligibility remained UNKNOWN; no verified suitable job was invented. It generated/reviewed/edited a CV using source-backed wording, retained master and parent revisions, rendered CV/cover, approved immutable packages with explicit uncertainty reason, invalidated approval on edits, downloaded four matching files and opened the actual official public URL.

Employer evidence: exactly one initial official GET to https://jobs.ashbyhq.com/Ashby/2d03f0fe-2f3c-4c8e-9b89-7c6a35f9e7a4, no referrer/opener/body/private query. Other employer resources/forms were not interacted with. Candidate confirmation recorded a **simulated** submission in the controlled SDK store; it is not a real employer receipt or a live Puter submission-history certification. Tracking/interview/follow-up, refresh, withdrawal, duplicate/reapplication intent and stale identity rejection passed. This is a verified functional journey on an uncertain real description, not successful discovery of a verified eligible vacancy.

Negative evidence is indexed by actual case names/files in milestone-6-negative-test-matrix.json: source outages,429/cooldowns, malformed HTML/PDF, prompt injection/fabrication, AI failures/fallback, session changes/expiry/stale data, concurrent forks/heads, refresh, lost receipts/unconfirmed storage, duplicates and download guards. Categories overlap and are not summed as separate test counts. These are deterministic tests; the actual Lever timeout is separately live evidence. No live paid model accuracy/retention test, real-provider stress/rate-limit attack or physical interrupted native download was performed.

Earlier failures retained in evidence: Greenhouse URL regression red→green; setup stale-service red/repair→green; missing-dispatch false-overlap red→green; synthetic SDK test root/escaping corrections; initial journey output-directory import failed before starting the app and was corrected. Existing PDF.js malformed/encrypted fixture warnings and build notices do not represent failed final assertions. Final automated failures/pending cases:0; unresolved live/environment cases remain separately classified above.

## 8. Reproduction and next review items

From work/resume-analyzer, Node24.13.1 and PowerShell:

```powershell
npm ci
npm test -- --reporter=default --reporter=json --outputFile=../../outputs/milestone-6-tests.json
npm run typecheck
npm run build
node scripts/ssr-smoke.mjs
node scripts/http-smoke.mjs
npm audit --json
npm audit --omit=dev --json
node scripts/release-audit-report.mjs
node scripts/release-provider-acceptance.mjs
$env:JOBPILOT_PLAYWRIGHT_MODULE='<PLAYWRIGHT_MODULE_PATH>/index.mjs'
$env:JOBPILOT_BROWSER_EXECUTABLE='C:/Program Files/Google/Chrome/Application/chrome.exe'
node scripts/profile-browser-smoke.mjs
node scripts/jobs-browser-smoke.mjs
node scripts/matching-browser-smoke.mjs
node scripts/preparation-browser-smoke.mjs
node scripts/applications-browser-smoke.mjs
node scripts/release-journey-browser.mjs
```

The journey replays the prior public snapshots and requires those files; rerunning public acceptance refreshes them and can change role availability/coverage. Uncertain/ineligible evidence must not be edited to force a passing journey. Run the native/PDF unit suite apart from heavy browser/build activity to limit startup contention. Test servers need actual Windows loopback access; restricted-sandbox socket failures were distinguished from application defects. Initial port5174 was absent while the intended expanded server on5175 returned200 in Windows and was confirmed working by the user. No forwarding/public tunnel was created.

Next review: authorize a Vitest major migration separately; complete request-level live timing/late-write tests with explicit dispatch/network evidence and alias-safe normal UI; perform native DOCX manual acceptance; review hosting/Puter identity and security headers on the exact intended origin; review permitted catalog coverage. The documented SDK upload lifecycle callbacks (init/start/progress/abort) may support a future bounded network test, but none was claimed performed here. Read-only recovery/cleanup for this run is complete: no more sign-ins are required for the evidence already collected.

## Changed files

Production: package.json, package-lock.json, app/features/applications/destination.ts. Tests: applications-destination.test.ts plus release-{isolation,storage-audit,file-audit,recovery,setup}.test.ts. Verification-only: release-account-harness.html/.js, release-isolation.ts, release-storage-audit.ts, release-file-audit.ts, release-recovery.ts, release-setup.ts, finish-release-setup.html, inspect-release-storage.html, inspect-release-files.html, recover-release-fixtures.html, serve-release-harness.mjs. Tooling: release-provider-acceptance.mjs, release-audit-report.mjs, release-document-fixtures.mjs, release-harness-smoke.mjs, release-harness-negative-smoke.mjs, release-journey-browser.mjs, and five extra HTTP privacy checks. Documentation: completion/audit/native procedure, release-blocker register, verification gate, plan and README. Everything remains local and reviewable.

## Local verification server after cleanup

The task-created port5175 harness server was stopped after both account cleanups. To rerun standalone verification tools later, start a separate PowerShell terminal in work/resume-analyzer and run `node verification/serve-release-harness.mjs`. Its URL is http://127.0.0.1:5175/verification/release-account-harness.html. Starting a new run does not recover old in-memory aliases; use the dedicated recovery tool for stored synthetic fixtures and verify the exact run/account marker. No public tunnel is needed or authorized. Native DOCX manual checks use the saved local output files and need no harness server.
