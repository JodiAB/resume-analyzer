# Milestone 5 completion — local review only

29 October 2026. Application approval, manual handoff and tracking are implemented locally. No push, public deployment, real employer submission, email or form automation occurred. Stop for review; no later milestone started. Full live isolation remains OPEN / NOT PASS.

## Verified PASS

| Check | Actual result | Evidence in task outputs |
|---|---|---|
| Full automated regression | 377/377 tests, 39 files; zero failed/skipped | milestone-5-tests.json |
| Baseline preservation | All 343 Milestone 4 test names/files still pass; 34 additions | milestone-5-regression-comparison.json; milestone-5-baseline.json |
| TypeScript | Exit 0 | milestone-5-typecheck.log |
| Production build | Exit 0 | milestone-5-build.log |
| SSR privacy | 10 routes pass; private loading shells expose no records | milestone-5-ssr.log |
| Real loopback HTTP | 18 checks pass, including control, routes, static assets, removed public images and API rejection | milestone-5-http.log |
| Browser regressions | 55 scenarios: profile9, discovery12, matching10, preparation11, applications13 | milestone-1-browser.json through milestone-5-browser.json |
| Approved downloads | Four actual CV/cover PDF/DOCX downloads match approved SHA-256 manifests | milestone-5-browser.json; milestone-5-approved-* files |
| Document content | CV1 PDF page/20 DOCX paragraphs; cover1 page/10 paragraphs; every DOCX paragraph appears in corresponding selectable PDF; no tables | milestone-5-document-qa.json |
| Visual checks | Desktop/mobile tracker, both approved PDF pages inspected; no viewport overflow | milestone-5-tracker-desktop.png, milestone-5-tracker-mobile.png, milestone-5-{cv,cover}-page-1.png |
| Synthetic handoff | Exactly one explicit intercepted official GET; no body, referrer or opener; no automated employer POST/PUT/PATCH or candidate-to-employer data request | milestone-5-browser.json |

Browser tests run the production app and real local document renderers, with a controlled synthetic Puter transport. The official-looking synthetic ATS URL is intercepted before contacting an employer. These are not live account-isolation tests or evidence of real employer receipt. Prior browser scripts were rerun, not inferred from historical reports.

## Implemented behavior

Each owner-scoped immutable package contains application/vacancy identity, complete source job/description/profile/assessment/preparation snapshots, canonical official destination, candidate-confirmed screening answers, CV/cover revision/content/file hashes, and a full-package hash. Local renderers regenerate files and compare exact bytes before approval or approved downloads. No binary documents are stored in KV and the master CV is never overwritten.

DRAFT → READY_FOR_REVIEW → APPROVED → AWAITING_SUBMISSION → SUBMITTED → FOLLOW_UP → CLOSED is enforced, with appropriate REJECTED/WITHDRAWN transitions. Denial returns to DRAFT. Approval requires six intentional acknowledgements and the exact current package hash. Package edits create a child revision, clear approval and return to DRAFT. Unsupported/missing facts or INELIGIBLE assessments block approval; UNKNOWN requires an explicit recorded uncertainty reason and remains UNKNOWN.

Only an approved current package can open the reviewed official ATS destination, download approved files or copy saved screening answers. Opening a page does not record submission. SUBMITTED requires a candidate checkbox, actual time and explicit note, and is labeled CANDIDATE_CONFIRMED rather than independently verified. Submitted packages remain immutable; tracking changes preserve submission evidence. Historical approved downloads recheck ownership and exact bytes, while expired sources cannot authorize another employer handoff.

Private tracking includes employer response, interview/offer stage, interview time, follow-up date and notes; search/filter/sort and refresh preserve history. Discovery shortlist/review state is separate. Canonical vacancy identity prevents accidental duplicates across refresh; a separate reapplication requires explicit intent and a reason, retaining earlier history.

Owner-prefixed append-only Puter events have bounded storage, captured identity guards, same-origin Web Locks, optimistic heads, exact-ID retry reconciliation and readback confirmation. Wrong-owner data, changed identity, missing parents and concurrent cross-device forks fail closed. This is not a distributed transaction or a live-service isolation guarantee. At most1000 events/200 applications and20MB aggregate event history are accepted; limits block new writes rather than silently dropping history. Cross-device forks require resolution before further operations; automatic merging is intentionally absent.

Official destination validation accepts exact source/board/vacancy paths on reviewed Greenhouse/Lever/Ashby hosts only. Manual/custom URLs, changed roles, credentials, private addresses, encoded traversal and redirect queries are blocked. Original URLs remain visible as inert source evidence. The normal browser can follow later employer-controlled redirects, which the app cannot inspect or certify; the app never attaches candidate documents or answers.

## Failures found and repaired

- Handoff initially leaked the local origin in Referer despite removing the opener. Changed navigation through an isolated target and noreferrer anchor; actual browser now asserts empty referrer and opener.
- Session capture during component mount could throw outside the async error boundary after account switching. Moved capture inside guarded work with stale-effect cleanup; account-switch unit/browser regressions pass.
- Submission default truncated seconds and could predate a package created in the same minute. Preserve milliseconds in the local datetime value with matching input precision. A same-second controlled-clock regression reproduced the remaining fractional-second edge before the fix (milestone-5-timestamp-red.log); the final full suite verifies the fix.
- Long immutable content hashes overflowed mobile text. Added wrapping and repeated full browser mobile check successfully.
- Default1-second UI query deadlines were unreliable for the real multi-step crypto flow. Bounded10-second queries/15–20-second workflow deadlines now pass in the full suite, without skipping assertions.
- A supplemental document QA invocation reused Milestone4's hardcoded fixture name and failed that assertion. Parameterized file prefix/expected synthetic name; actual M5 files then passed all content checks. No generated-document content change was needed.

Final verified failures: zero automated/unit/browser/type/build/SSR/HTTP failures. Fresh independent review found no remaining important approval/privacy defect; its fractional-second timestamp observation was reproduced and repaired. PDF.js emits existing Node/standard-font warnings in malformed/encrypted/synthetic fixture checks; all recovery assertions pass. Production build retains existing unused-import/empty-resource-chunk notices.

## BLOCKED / NOT TESTED / remaining security risks

See docs/release-blockers.md for required closure evidence.

- OPEN / NOT TESTED: full real multi-account isolation, including the new applications namespace; reverse raw-service access/deletion; actual SDK wire-in-flight account changes/late writes; deployment-origin privacy and permissions. Mocks and delayed consumer checks do not close this gate.
- BLOCKED by environment: native-compatible DOCX page appearance remains unverified because LibreOffice/Word is unavailable. DOCX XML/content, selectable PDF, real download hashes and separately rendered PDF appearance pass; those are not native DOCX layout evidence.
- Verified unresolved security finding: fresh npm audit reports30 vulnerable package entries:8 critical,18 high,3 moderate,1 low. Retained Router/Vite/Vitest chains require planned remediation/contextual assessment. No dependencies were changed or blanket audit fix applied. milestone-5-npm-audit.json retains the evidence.
- NOT TESTED: live paid-model semantics, provider retention and production Puter behavior. M5 adds no model call. Existing schema/evidence validation remains mandatory.
- Environment limitation: automated Chrome can suppress repeated same-tab downloads. All four approved files were verified across fresh tabs without weakening browser security settings.
- Candidate screening answers and submission statements are self-attestations. No claim of independent factual verification or actual employer receipt.

## Changed files for this milestone

New runtime: app/features/applications/{destination,model,repository,service}.ts; app/features/applications/{PackageEditor,ApplicationView}.tsx; app/routes/applications.tsx.

Integration: app/routes.ts; app/components/Navbar.tsx; app/lib/validation.ts; app/routes/prepare.tsx; app/features/jobs/JobCard.tsx (source link presented as inert evidence; handoff goes through approval).

Tests/evidence tooling: tests/applications-{destination,domain,repository,service}.test.ts; tests/applications-ui.test.tsx; tests/fixtures/application.ts; scripts/applications-browser-smoke.mjs; scripts/{ssr-smoke,http-smoke}.mjs; scripts/verify-preparation-documents.py (backward-compatible fixture parameters).

Documentation: README.md; docs/release-blockers.md; docs/verification-gate.md; docs/superpowers/plans/2026-10-29-application-management.md; docs/milestone-5-completion.md; task outputs/milestone-5-*.

All earlier accepted staged/unstaged work was preserved. No authentication/storage migration, dependency upgrade, commit, push or deployment.

## Reproducible commands

From work/resume-analyzer, Node24.13.1 / PowerShell:

```powershell
npm test -- --reporter=default --reporter=json --outputFile=../../outputs/milestone-5-tests.json
npm run typecheck
npm run build
node scripts/ssr-smoke.mjs
node scripts/http-smoke.mjs
$env:JOBPILOT_PLAYWRIGHT_MODULE='<PLAYWRIGHT_MODULE_PATH>/index.mjs'
$env:JOBPILOT_BROWSER_EXECUTABLE='C:/Program Files/Google/Chrome/Application/chrome.exe'
node scripts/profile-browser-smoke.mjs
node scripts/jobs-browser-smoke.mjs
node scripts/matching-browser-smoke.mjs
node scripts/preparation-browser-smoke.mjs
node scripts/applications-browser-smoke.mjs
& '<PYTHON_EXECUTABLE_PATH>' scripts/verify-preparation-documents.py --prefix milestone-5 --file-prefix milestone-5-approved --expected-name 'Synthetic Candidate'
npm audit --json
```

Run the PDF/unit suite separately from heavy builds/browsers to avoid native setup contention. Local server/typegen/Chrome checks needed approved sandbox loopback/process access. HTTP control succeeds in that same execution context; restricted-sandbox failures alone do not establish an app HTTP defect. Audit intentionally exits nonzero while advisories remain. No credentials/tokens/personal CV fixtures are needed for these reproducible synthetic checks.
