# Milestone 4 — Evidence-based CV tailoring and preparation

29 October 2026. Implemented in the controlled local checkout only. **Full live account isolation remains OPEN / NOT PASS.** No push, deployment, application approval, external form fill, employer email or submission. Stop for review before Milestone5.

## Use and implemented behavior

Start the main app with `npm run dev -- --host 127.0.0.1`, use the URL it prints and open `/jobs`. Assess a job, manually shortlist it, then choose **Prepare documents**. `/prepare` also lists shortlisted jobs. The account harness on port5174 is a separate verification server, not the app.

The private preparation screen shows employer/title, current assessment score/eligibility/confidence, CV/cover status, generation time, profile revision, plain-text previews, ATS evidence classifications, master-to-draft comparisons and immutable history. Contact details are explicitly candidate-entered/confirmed and consistent across outputs; they are not inferred from the authentication username. Classic/compact templates use standard single-column headings. The master PDF/profile and employment dates are never overwritten.

Generate a deterministic draft or explicitly consent to a bounded Puter AI request. Select/order evidence, move skills to match requirement order, choose projects and source statements for the summary/cover, omit items deliberately, and edit statements. Save changes as a new child revision. Every version remains DRAFT_REVIEW_REQUIRED; there is no automatic approval. Review the saved draft and confirmed contacts, render local previews, validate a file, then click its download link. Source/owner/integrity checks run again at the actual click.

## Truth, editing and keyword boundaries

- Confirmed CV-backed profile facts are authoritative. Professional employment, explicitly paid freelance, freelance with unverified payment, independent projects, education/certifications, technical skills and developing skills remain separate. Dates are copied unchanged, never inferred or inflated. No project period becomes commercial employment. The shared matcher now also refuses negated/ambiguous paid-freelance labels, including “never paid” and “not yet paid.”
- All material output statements link to their profile claim/evidence. Comparisons identify preserved/omitted/reordered facts, included verified skills, date-preserving shortening and pending edits. Source pages and quotes remain inspectable. A user edit never updates the master profile silently.
- **Deliberately restricted rewriting:** complete source statements are retained. Only a redundant trailing original start-to-end range can move from the statement into its unchanged date line. Arbitrary extractive shortening was rejected after review demonstrated negation loss. New factual wording is retained as a pending draft edit and blocks export until the master evidence supports it and the job is reanalyzed/regenerated. Confirmation alone cannot turn unsupported text into a verified qualification. This is less stylistically flexible than free-form AI rewriting and is an explicit limitation, not a claim of unrestricted paraphrase validation.
- AI selects and orders cited content and can choose this safe date-preserving rewrite. Deterministic summary/cover templates arrange the evidence into modest role/employer-specific language. No model-generated achievement, number, leadership responsibility, commercial duration, proficiency or certification is accepted. Cover-letter evidence is editable through the same supported statement controls; unrestricted factual prose is not accepted.
- Keyword analysis includes recognized technical skills, qualifications, responsibilities/domains and unresolved requests. It distinguishes VERIFIED_INCLUDED, VERIFIED_OMITTED, TRANSFERABLE, UNSUPPORTED (candidate-declared gaps), and MISSING_EVIDENCE. Developing/negated evidence does not establish verified proficiency. Unknown requirements remain visible and are not inserted merely for coverage. This is an evidence classification, not an ATS/interview probability. Experience/seniority judgments remain separately explained by the qualification assessment.

## Documents and traceability

`docx` generates editable OOXML paragraphs. `pdf-lib`/fontkit generates actual selectable text with bundled SIL-licensed Noto Sans Latin/Latin Extended subsets, A4 margins, deterministic wrapping/pagination and a40-page/content bound. No images, hidden keyword text, macros, fields, decorative columns or tables are added. Unsupported font glyphs fail closed rather than being dropped or replaced. Other writing systems remain a documented export limitation.

The same canonical lines supply text preview, PDF and DOCX. Browser previews use the existing local PDF.js worker to render readable pages with page selection; they do not rely on a native PDF plug-in. Preview canvas images do not replace the selectable text in the exported PDF. PDF metadata and DOCX metadata/archive times bind to the generation timestamp, so repeated rendering of the same revision produces identical SHA-256 values in tests. Downloads expose hashes and real browser files were compared against them. Contact, dates, reading order and intended content were checked through PDF.js extraction, actual OOXML and python-docx; long content pagination was tested. Generated CV and cover PDFs were rasterized using PDFium and every synthetic page visually inspected: no clipping/overlap/missing accented name.

**Native DOCX visual QA is BLOCKED:** packaged `render_docx.py` was run and failed because `LibreOffice soffice.exe was not found on PATH`. The second run used a workspace temporary directory to remove unrelated sandbox cleanup noise; the missing converter remained the sole blocker. No Word/LibreOffice page-layout equivalence is claimed. DOCX structure/content verification passed; native DOCX page images were not produced. See `milestone-4-docx-render.log`.

## Storage, AI and privacy

No authentication/storage migration. Private immutable KV namespace: `jp:v1:prep:<owner>:<revision>`. Revisions contain owner, parent, generation time, source context/hash, content hash, mode, review-required status, draft and private profile/job/assessment snapshots. They preserve historical evidence instead of replacing master records. Limits:100 revisions,1.5m characters per record,10m total. Web Locks are required; exact-ID readback reconciles lost receipts without another model call. Ambiguous outcomes freeze other mutations until unchanged retry/reload; no history/root deletion or blind regeneration.

Snapshots include confirmed contact, draft edits, source profile text/claims and the complete job snapshot in **private Puter KV storage**. PDF/DOCX bytes are generated locally and not uploaded. Storage processing is distinct from the optional AI request: the AI model receives public job title/employer/description, selected confirmed claim IDs/kinds/labels/dates and bounded assessment requirements/gaps. It receives no contact fields, full PDF, extracted page array, authentication token, owner ID or other private documents. The exact request is previewed; edits reset consent. Context binding rejects changed profile/job/assessment/review before chat and after async generation. Limits:40 selected claims,20k job characters,60k total request,40k response,5000 output tokens. Structured JSON, strict source references, completion/refusal/tool checks and no action tools. No live paid call or automatic paid retry was used.

Captured sessions and guarded SDK operations fail closed around every async source read, AI result, save, render and download. Current profile/job/preferences/assessment/shortlist state is rechecked; stale evidence requires reanalysis/regeneration. Old history remains inspectable without being silently exported as current. Rendered blob URLs are revoked on replacement/unmount. Download links bind URL/hash/filename and generation; focus/visibility/expiry invalidate tickets, and actual link clicks rerun current-source, session and SHA-256 checks. A ticket is not treated as proof that remote sources remain unchanged. Cross-device atomicity and live service ownership remain unverified; no such guarantee is inferred from mocks.

No candidate contents are sent to employer discovery APIs. No new server route accepts candidate uploads. `/prepare` SSR only returns the authenticated loading shell. No candidate localStorage, public document URL or multi-user sharing feature was introduced.

## Verification and actual failures

| Classification | Check | Result |
|---|---|---|
| Verified PASS | Existing baseline after dependency installation | 291/291 |
| Verified PASS | Full regression | 343/343;0 failures;0 pending; all291 baseline test names preserved |
| Verified PASS | New coverage | 49 preparation cases plus3 matching freelance regressions =52 additional cases |
| Verified PASS | TypeScript / route generation | `npm run typecheck`, exit0 |
| Verified PASS | Production client/server build | `npm run build`, exit0; no deployment |
| Verified PASS | SSR | 9 routes including `/prepare`, private loading shell only |
| Verified PASS | HTTP | 17 checks including pages, assets, privacy404s and public-feed API input/method rejection |
| Verified PASS | Real document content | DOCX ZIP/XML/python-docx, actual PDF selectable text/order/dates, four download hashes, deterministic bytes and multi-page bound |
| Verified PASS | PDF visual QA | Synthetic CV/cover page PNGs rendered and inspected |
| Verified FAIL, repaired | Negation and payment repros | Arbitrary shortening and negated-payment promotion were observed failing, fixed and regression-checked; negated ATS evidence and skill ordering also repaired |
| Verified FAIL, repaired | Native PDF preview | Blank embedded viewer observed in Chrome screenshots; replaced with actual PDF.js page rendering, real-browser ready assertions and inspected page screenshots |
| Verified FAIL, repaired | Download freshness/status | Actual click now rechecks source/hash rather than trusting the earlier ticket; old saved status is cleared when a new generation starts |
| BLOCKED by environment | Native DOCX visual renderer | Missing LibreOffice executable; no native page-layout PASS claim |
| Browser limitation | Repeated same-tab downloads | Automated Chrome suppressed later same-tab handoffs. Four actual files verified across fresh tabs without disabling security preferences. Users may need to permit repeated downloads or reopen the page |
| NOT TESTED / release blocker | Full live isolation | Real new preparation namespace, reverse raw account access, genuine network-in-flight switching and deployment origin |
| NOT TESTED | Live paid semantic model | Controlled fixtures only; actual provider schema adherence/retention/semantic quality not certified |

All four browser suites passed:9 profile +12 discovery +10 matching +11 preparation =42 scenarios. Browser evidence is recorded separately in `milestone-4-browser.json` (11 scenarios,4 actual downloads), alongside rerun M1/M2/M3 evidence. The M4 script covers job selection, non-AI draft, actual rendering/previews, hash/content downloads, layout, unsupported edit blocking, revision lineage, fabricated AI rejection, deterministic recovery/controlled AI, account changes and no external submission/localStorage/page errors. Fresh browser tabs were used for the cover files after same-tab suppression; this is disclosed rather than represented as a single-tab download PASS.

Dependency installation/audit reported **30 vulnerabilities:8 critical,18 high,3 moderate,1 low** in the retained stack/ranges. No advisory entry was reported for the five new direct renderer/font/ZIP packages; the high nanoid entry applies to the retained3.x node, not docx's6.x dependency. This is not a clean security audit. Unrelated framework/test/server upgrades were not silently applied. Remediation/impact review is a public-release blocker, alongside the live isolation gate.

The interrupted tool batch on28 October was not executed: automatic approval review hit a usage limit. Work resumed after the user's “continue”; no bypass or push occurred. All reported final checks were actually run after resuming.

## Reproducible commands

From `work/resume-analyzer`, Node24 / Windows:

```powershell
npm test -- --reporter=json --outputFile=../../outputs/milestone-4-tests.json
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
# Bundled Python includes pypdfium2 and python-docx:
python scripts/verify-preparation-documents.py
npm audit --json
```

Run full unit/native PDF tests apart from heavy Chrome/build work to avoid the known PDF initialization contention. The actual unit run was standalone. Approved local execution was used for sandbox-blocked loopback/browser/typegen/build. This is not public deployment authorization. A normal environment can supply its own Playwright installation and Chrome path.

Evidence in task `outputs`: `milestone-4-tests.json`, `milestone-4-baseline.json`, `milestone-4-regression-comparison.json`, `milestone-4-browser.json`, `milestone-4-document-qa.json`, `milestone-4-npm-audit.json`, `milestone-4-docx-render.log`, `milestone-4-preparation-desktop.png`, `milestone-4-preparation-mobile.png`, `milestone-4-cv-page-1.png`, `milestone-4-cover-page-1.png`, `milestone-4-browser-cv-preview.png`, `milestone-4-browser-cover-preview.png`, and four synthetic downloaded files. The sample files are verification fixtures, not the user's CV or an approved application.

## Changed files

- New `app/features/preparation/`: `model.ts`, `semantic.ts`, `records.ts`, `repository.ts`, `service.ts`, `render.ts`, `artifacts.ts`, `DraftEditor.tsx`, `CheckedDownload.tsx`, `PdfPreview.tsx`.
- New `app/routes/prepare.tsx`; new six `tests/preparation-*.test.*` suites, `scripts/preparation-browser-smoke.mjs` and `scripts/verify-preparation-documents.py`.
- Updated `app/routes.ts`, `app/components/Navbar.tsx`, `app/features/jobs/JobCard.tsx`, `app/routes/match.tsx`, `app/lib/validation.ts`, SSR/HTTP smoke scripts for private preparation navigation/checks.
- Updated `app/features/matching/experience.ts`, `app/features/matching/requirements.ts` and `tests/matching-domain.test.ts` for affirmative paid-freelance/negation safety shared with preparation.
- `package.json` / lockfile add `docx`, `pdf-lib`, `@pdf-lib/fontkit`, `@fontsource/noto-sans`, `fflate`. Earlier291-test architecture/dependencies otherwise retained.
- Updated README, verification gate and implementation plan; this completion report copied into task outputs. Prior staged/untracked milestones preserved, no reset/stash/commit/push/deployment.

## Review boundary

Milestone4 code is implemented and locally tested with the explicit native-DOCX visual and browser-download limits above. Do not treat this as production security approval or full live isolation PASS. Do not start Milestone5 application approval/submission controls without review authorization.
