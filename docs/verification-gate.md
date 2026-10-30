# JobPilot AI — stabilization verification gate

Date: 23 October 2026. Status: **OPEN — local verification passed; live two-account sign-in/results pending.** No major V1 development, push or deployment has occurred.

This report separates client regression evidence, actual local browser/HTTP behavior and real Puter service authorization. A mocked test is never treated as proof of service isolation.

## Verified PASS

| Area | Evidence and scope |
| --- | --- |
| Original baseline | `gate-baseline-tests.json`: 53/53 passed before gate repairs. All original test names remain present and passed in the final results. |
| Final automated tests | `npm test -- --reporter=json --outputFile=../../outputs/gate-final-tests.json`: **74/74 passed, 8 files**, zero failed. Original 53 plus 21 new cases. |
| TypeScript | `npm run typecheck`: exit 0 after repairs. No suppression added for application errors. |
| Production build | `npm run build`: exit 0, 88 client modules and 28 SSR modules. Existing nonblocking unused React import warning remains. |
| Built SSR | `node scripts/ssr-smoke.mjs`: five routes returned 200 and private routes rendered only session-loading shells. No private resume record serialization. |
| Actual HTTP | `node scripts/http-smoke.mjs` outside the restrictive sandbox: loopback control, five production routes and two static assets passed; three removed sample CV URLs returned 404. The script starts the actual React Router production server as a child, tests it over TCP, then stops it. |
| Browser PDF parsing/rendering | Nine actual browser scenarios passed against the real PDF.js worker and app converter; see `gate-browser-pdf.json`. Two literal page sentinels extracted; preview visibly readable at 2448 × 3168, PNG 206697 bytes. Malformed/encrypted/oversized inputs failed safely and a valid PDF succeeded after each. An image-only scan returned zero text items. |
| Native PDF integration | Six tests use the real parser, shipped worker implementation and native canvas, with synthetic fixtures. The PNG test now requires visible dark pixels, not just an image header/byte count. Node uses same-thread worker fallback; this is separately identified from the browser Worker check. |
| Client async account-switch safeguards | Eight new local controlled-SDK cases cover upload, AI, read and deletion results after an out-of-band switch, unavailable post-request identity, foreign-root deletion, transaction abort and stopping a deletion before its second file/key. These prove app behavior under controlled identities, **not live Puter isolation**. |
| Controlled AI responses | Existing and six additional cases reject refusals, oversized responses, invalid/missing scores, malformed category/tip structures and non-string tip kinds. No invalid completed analysis is saved. Schema validation does not establish factual accuracy. |
| Independent review | Reviewer found no important remaining local defect in the reviewed repairs. Focused re-review: 15 tests passed across 3 files. Review findings about cleanup labels and blank PNG evidence were corrected. |

Automated test groups: original auth 7, original services 36, original components 9, original loader 1; new account-switch 8, AI controls 6, PDF limits 1, real PDF integration 6. Total 74. Browser/HTTP/SSR checks are reported separately rather than added to the Vitest count.

## Verified FAIL — discovered and repaired during this gate

| ID | Reproduction before repair | Repair and repeated evidence |
| --- | --- | --- |
| F1 — stale SDK result | Start upload/AI/read/delete with SDK owner A, switch SDK owner to B without a focus event, resolve the pending promise. Cached-state-only postcheck accepted the result. Four new cases failed. | Reverify the SDK identity after the operation as well as before it; discard the result and clear private session state on mismatch/ambiguity. All four cases pass. This cannot undo a remote mutation already accepted. |
| F2 — path ownership | Pass a different user/app absolute path to the signed-in store's delete method. The old wrapper forwarded it to the SDK. This did not demonstrate that the server would allow it. | Resolve the current app root with SDK `fs.stat('.')`, recheck identity after that async step, validate the path and confine all guarded file operations/feedback attachments to that root. Missing/ambiguous root fails closed. Foreign-root deletion regression passes without a delete dispatch. |
| F3 — unbounded preview allocation | A controlled oversized viewport was accepted for rendering. The failing test used a tiny fake canvas to avoid intentionally exhausting memory. | Refuse nonfinite/invalid sizes, either dimension over 8192 or over 16 million pixels before creating a canvas. Apply the existing 20 MB file bound in the converter and release PDF loading tasks on success/failure. Real oversized fixture now rejects safely. |
| F4 — AI enum coercion | A response containing `tip.type: ["good"]` passed through `String(...)` enum coercion. | Require a primitive string enum. Regression passes; all original AI cases preserved. |
| F5 — public CV samples | Actual production HTTP returned 200 for the pre-existing unused `/images/resume-1.png` sample. Provenance/consent was unverified; no assertion is made that this was an actual cross-account disclosure. | Removed exactly three unused bundled CV PNGs and their unused demo records after confirming application routes do not use them. Rebuilt server returns 404 for all three. No existing uploaded resume was deleted. Existing deployed versions/history were not changed. |
| F6 — verification false positive | The initial native PNG test accepted an image whose glyphs had not rendered. Strengthened test failed with zero dark pixels. | Embedded a licensed font in the synthetic fixture, added a visible-pixel assertion, and repeated actual browser visual inspection. Native test and browser checks pass; font license included. |
| F7 — harness cleanup labels | Review found a cleanup PASS could follow auxiliary errors, and an already deleted auxiliary target was retained for cleanup. No live cleanup result had been claimed. | Confirm file absence and KV outcomes, report aggregate BLOCKED on incomplete cleanup, and remove successfully deleted auxiliary targets from the pending list. No live cleanup PASS is asserted until actually run. |

There are **no currently failing local automated tests**. The live gate is still open; fixing local regressions is not a service-security certification.

## BLOCKED by environment / interactive prerequisites

1. **Live account isolation:** the user has offered two disposable accounts, but no successful authenticated A/B session or service results have yet been observed. The in-app Puter sign-in popup did not appear and sign-in returned to signed-out. The user is switching to a normal browser. No passwords/tokens have been requested, read or exported by the verification code.
2. **Raw Puter cross-account authorization:** B reads of A's synthetic PDF/key, raw B deletion of A's synthetic PDF, verification that A survives, and account-specific cleanup are pending those sign-ins. They are not labeled PASS based on wrappers or mocks.
3. **Live SDK delayed-result checks:** the local harness is prepared for read/upload/auxiliary deletion. It uses real service responses with deliberately held SDK result delivery. Those checks have not yet run. Even when run, they will be labeled delayed-delivery tests, not proof that bytes were still on the wire when accounts switched.
4. **Live Puter AI test mode:** an explicit test-mode button is available, using the official free test-mode overload and no document attachments. It has not been run in an authenticated account. No paid inference is attempted by the harness.

The initial localhost failure is now explained, not left as an application failure: the same-process plain HTTP control failed in the sandbox with `connect EACCES 127.0.0.1`. Outside that restriction, control and production TCP checks passed. Earlier cross-context timeouts alone did not establish an app defect.

## NOT TESTED

- Actual paid model inference, availability of the configured `grok-3` model, factual faithfulness of generated candidate material, or production-provider retention. V1 CV/profile generation is not implemented.
- Wire-level live account changes during ongoing Puter upload/AI/read/delete requests, including A→B→A changes. Pre/post checks cannot atomically bind an ambient SDK credential to an in-flight remote request or cancel a completed mutation.
- Live storage metadata compatibility, symlink/shared-file semantics, provider missing-file/error codes, origin/app identity across deployment domains, and provider trash/recovery behavior.
- Authenticated browser end-to-end legacy upload/review, multi-device KV concurrency, malicious compressed-PDF fuzzing, Docker/Node 20 compatibility, dependency vulnerability audit and deployed CSP/security headers.
- Existing public deployments. No push or deployment was authorized/performed, so local repairs do not change the live website or repository history.

## Storage and privacy review

The app retains Puter and React Router; no major auth/storage migration was introduced. According to [Puter's stat documentation](https://docs.puter.com/FS/stat/), relative paths resolve against the app root. The guarded implementation now obtains that root from the SDK rather than trusting record suffixes alone. Real account isolation is still a server-side property to be tested.

New analyzer documents remain in dedicated private `jobpilot/resumes/<id>/` folders, with `resume:<id>` records and `resume-pending:<id>` recovery journals. Deletion uses validated records and exact owned file/key targets; it never flushes KV or scans/deletes the root. Unknown legacy provenance, ambiguous outcomes and failed metadata writes are retained for review/retry. No public read/share link is generated. No personal production document was used as a fixture.

The live harness intentionally holds synthetic A/B references in page memory to attempt access under the other test account. It exports only run IDs, aliases, PASS/FAIL/BLOCKED labels and sanitized evidence—not account identifiers, raw SDK responses, passwords or tokens. Deny any request to broaden sharing/access; accepting it would invalidate an isolation test.

## Reproduce

From the source repository directory:

```powershell
npm ci --ignore-scripts
npm test -- --reporter=json --outputFile=../../outputs/gate-final-tests.json
npm run typecheck
npm run build
node scripts/ssr-smoke.mjs
node scripts/http-smoke.mjs
```

Run HTTP checks in a context permitted to connect to loopback; otherwise record EACCES as an environment failure. The production test server is stopped automatically.

For actual browser PDF checks:

```powershell
node verification/serve-pdf-harness.mjs
```

Open `http://127.0.0.1:5174/verification/pdf-harness.html`, run the checks and inspect the preview. The standalone harness is deliberately not an application route and is not shipped in the production build. The app still previews page one; full-page text extraction here tests the underlying parser, not an implemented candidate-profile feature.

Fixtures are checked in. Optional regeneration uses `python scripts/create-safe-pdf-fixtures.py` with ReportLab, pypdf and Pillow. All inputs are synthetic; the encrypted fixture's known test password is unrelated to account authentication.

## Pending live procedure

Keep `http://127.0.0.1:5174/verification/account-harness.html` open; reloading loses in-memory fixture references. Use only disposable accounts.

1. Sign into A through Puter; create the synthetic A fixture. Report its result before continuing.
2. Sign out without closing the harness; sign into distinct B. Run B isolation checks. A raw-service denial must be an authorization/not-found result, not a generic network error.
3. Before final cleanup, run each held read/upload/auxiliary-deletion case: start under A, sign out and into B, then release. The app must reject the stale result. Return to A before arming the next case. This is delivery-gated testing, separately labeled from wire-level races.
4. Keep the main A fixture intact until those cases are completed or deliberately skipped. The combined verify/cleanup button must only be used at the end.
5. Return to A, verify the full synthetic PDF hash and private marker survived, and perform scoped test cleanup. B's own fixture is cleaned under B. If any target cannot be confirmed absent, report BLOCKED rather than PASS.
6. Export sanitized evidence JSON. Stop at any privacy FAIL; document and repair before continuing. No real candidate data, paid AI or broadened permissions are required.

The gate cannot be approved as fully passed until these live results are available and reviewed. Major V1 development remains paused.

## 27 October 2026 — controlled V1 development

User accepted stabilization for local controlled development only. Full live isolation is still NOT PASS. Reverse-direction raw access and real account changes during pending SDK network requests remain release blockers, alongside new profile KV live ownership verification. Milestone 1 implemented and locally verified; see `milestone-1-completion.md`. Stop for review before Milestone 2. No public deployment, push or automatic submissions.

## 28 October 2026 — Milestone 2 local handoff

Job discovery is implemented and locally verified: 228 automated tests passed, preserving all original 144; TypeScript/build, seven SSR routes, fifteen HTTP checks and twelve discovery browser scenarios passed. Existing profile browser regression also passed nine scenarios. See `milestone-2-completion.md`. Live public-provider GET checks are separate from controlled SDK/feed fixtures. Full live account isolation is still NOT PASS: reverse A-to-B access, real pending-request switching and new profile/discovery live KV isolation remain release blockers. Stop for review before Milestone 3; no push, deployment or submission.

## 28 October 2026 — Milestone 3 controlled local implementation

Qualification matching uses deterministic eligibility before scores, private source-bound records, explicit preview/cost consent for optional AI and stale identity/context rejection. See `milestone-3-completion.md` for verified results and limits. Full live isolation remains OPEN / NOT PASS, including new matching KV ownership. Existing unresolved reverse-direction and actual network-in-flight account scenarios remain release blockers. No push, deployment, tailoring or submissions; stop for review before Milestone4. This supersedes earlier milestone stop instructions only within the user's explicit Milestone3 authorization.

## 29 October 2026 — Milestone 4 local review boundary

Preparation is implemented with private immutable source-bound revisions, strict fact-preserving selection/editing, local PDF/DOCX generation and per-click source/owner/hash validation. Final verification:343/343 tests, all291 baseline cases preserved; type/build,9 SSR,17 HTTP and42 browser scenarios passed. Four actual browser downloads matched hashes and content. Native DOCX page rendering is BLOCKED by missing LibreOffice; repeated same-tab download suppression is disclosed.30 dependency advisories (8 critical) need remediation/impact review. Full live isolation including preparation KV, real network-in-flight switches, reverse raw service access and production origin remains OPEN / NOT PASS. No paid live semantic call, application authorization/submission, push or deployment. Stop for review beforeMilestone5.

## 29 October 2026 — Milestone 5 local review boundary

Immutable owner-scoped application packages, intentional approval, manual handoff and self-reported submission/tracking are implemented.377/377 tests preserve all343 baseline names/files; type/build,10 SSR,18 HTTP,55 production browser scenarios and four exact approved downloads pass. See `milestone-5-completion.md`. Synthetic SDK/browser verification does not close live multi-account isolation, real network-in-flight races or deployment-origin checks. Native DOCX page QA remains BLOCKED and audit reports30 vulnerable package entries (8 critical). No real employer submissions, paid model calls, push or public deployment. Stop for review.

## 30 October 2026 — Milestone 6 assessment

395/395 tests preserve all377 baseline cases. TypeScript/build,10 SSR,23 HTTP and55 original browser checks pass. A separate16-check synthetic-CV/live-public-description journey included a real official GET without submission. Raw static live read/deletion isolation passed both directions; B6/A12 keys and both PDFs were confirmed cleaned. Full live isolation stays OPEN: blocked read/upload races, unverified historical RPC overlap, no wire evidence. Native DOCX remains BLOCKED. Full npm audit3 dev entries, production audit0. Personal real-data local use, private deployment and public multi-user release are all BLOCKED. See milestone-6-completion.md. Stop for review; no push, deploy or real submission.


## 30 October 2026 — GitHub checkpoint boundary

Fresh418/418tests preserve all410 previously accepted assertions. Type/build,10SSR,23HTTP and55browser regressions pass; production audit0. These are controlled synthetic checks. Live in-flight isolation remains NOT TESTED and SEC-05memory-only harness lost-state remains OPEN. Latest synthetic run was recovered and exactly cleaned under both owners according to user-provided sanitized results. No security gate is promoted. Native DOCX visual, paid-model and deployment-origin verification remain outstanding. A development-branch push is explicitly authorized; main merge and deployment are not. See github-checkpoint-2026-10-30.md.
