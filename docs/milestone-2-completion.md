# JobPilot AI — Milestone 2 completion report

28 October 2026. Local controlled development only. Stop for review before Milestone 3. Full live account isolation remains OPEN; this report does not certify production security.

## Implemented outcome

The authenticated `/jobs` dashboard reads candidate profile search preferences, fetches configured public employer ATS boards through a GET-only React Router resource, normalizes source evidence, and keeps private saved, shortlisted and dismissed records. Refreshed dates or descriptions do not reset review decisions or create a duplicate NEW record. There are no qualification percentages, candidate-fit scores, new AI calls, automatic submissions, browser form filling or background application tasks.

React Router, TypeScript, Tailwind, Zustand and Puter remain in place. No authentication/storage migration or new package dependency was introduced. Existing mixed staged/unstaged stabilization and profile changes were preserved. No commit, GitHub push or deployment was performed.

## Implemented sources and research

| Adapter | Configured board | Dates | Availability / data limits |
| --- | --- | --- | --- |
| Greenhouse public Job Board API | `greenhouse` | `first_published` retains first-publication provenance; `updated_at` stays separate | Published list/details; optional detail pay-transparency bands preserve currency and cents conversion; undocumented pay period stays unknown. Prospect posts are omitted. |
| Lever published Postings API | `lever` | No publication date is inferred from undocumented creation/update fields | Documented skip/limit pagination, hosted application links, remote/type/location fields and disclosed salary bands. |
| Ashby public Job Postings API | `Ashby` | `publishedAt` is labeled last publication, possibly republication | `isListed=false` is excluded; `workplaceType` distinguishes hybrid from fully remote. Unlisted does not imply closed. |

Source contracts were checked against official documentation: [Greenhouse Job Board API](https://docs.greenhouse.io/job-board), [Lever Postings API](https://github.com/lever/postings-api), [Ashby public posting API](https://developers.ashbyhq.com/docs/public-job-posting-api). These documented public GET capabilities are not a blanket license for every employer or deployment. The enabled catalog is deliberately limited to three provider-owned public boards. Additional employers/feeds need access and terms review before catalog expansion. No LinkedIn, Indeed, authenticated ATS endpoint or restricted scraper was used.

This is per-board discovery, not a global search index. No additional third-party feed was enabled without documented review. The current catalog is in `app/features/jobs/boards.ts`.

## Search, evidence and review behavior

- Defaults: requested developer/engineer titles; South Africa; remote international work; UK/Europe/US Eastern overlap zones; seven rolling days; USD 3,000/month full time and USD 1,500/month part time. Profile titles, locations, salary and time-zone preferences seed discovery when no discovery override has been saved. No qualifications or work authorization are inferred from preferences.
- Preferences are editable and stored privately. Text search, role aliases, optional location text, disclosed salary and overlap-hint filters run locally. Unknown salary, incomparable currency/period, eligibility, employer headquarters and dates remain reviewable. No FX conversion or undisclosed hourly/monthly conversion is invented.
- Known old publication dates are excluded from new discovery; missing/future dates are UNVERIFIED and included by default. Updated timestamps never substitute for publication. Reviewed history remains inspectable regardless of age/eligibility filters.
- Explicit exclusions, recognized contrary mandatory locations, declared missing required work authorization, foreign on-site-only work and confirmed closure are filtered. Unknown residency, visa, citizenship and other geographic conditions prevent automatic verification. Fully remote filtering excludes known hybrid/on-site work; unknown remote evidence can remain for review.
- Positive SA eligibility requires explicit supporting text. Remote, worldwide or an office address alone does not establish it. Evidence excerpts, restrictions, salary, date provenance and last successful source-check timestamps are visible. Job skill names are literal mentions; requirement level is unverified and they are not claims about the candidate.
- Employer headquarters stay UNKNOWN unless a reviewed source configuration supplies evidence; they are never inferred from the job location. Current catalog headquarters are unknown, so international-only filtering retains these records for review.
- Stable source identifiers and canonical application URLs are retained. Canonicalization removes known tracking but preserves job-ID parameters. Source aliases can merge, including later bridge updates; dismissal is conservatively retained when alias groups have different review states. Immutable events preserve earlier decisions.
- Manual import accepts configured ATS URLs for official endpoint lookup. Other safe public HTTPS URLs and pasted descriptions are private UNVERIFIED records, never arbitrary fetch targets. URL-only unknown-title records remain discoverable rather than being hidden by default role filters. Descriptions render as inert text; no untrusted HTML is inserted into the DOM.
- Employer links are explicit navigation links with no-referrer protection. Opening them never uploads a CV, supplies screening answers, marks an application submitted or invokes an employer POST.

## Status meanings

| Status | Meaning |
| --- | --- |
| VERIFIED | A recent listed remote source snapshot has explicit SA compatibility and no recognized unresolved mandatory location/authorization restriction. This is evidence verification, not an employer identity investigation, legal guarantee, qualification match or hiring probability. |
| UNVERIFIED | Material evidence is missing, ambiguous, manual, future-dated or otherwise unresolved. It is retained for human review. |
| INELIGIBLE | There is affirmative incompatibility with the stated country/authorization requirements. |
| EXPIRED | An individual posting is confirmed absent/closed by a supported endpoint, absent from a validated complete published board where appropriate, or past its disclosed deadline. Partial pages and errors never establish closure. |
| SOURCE_ERROR | A recheck cannot establish current public evidence. Previous snapshots and decisions remain; no new availability is invented. An Ashby unlisted posting is not exposed or called closed. |

## Privacy and security boundaries

Public provider requests originate only in `.server.ts` adapters behind `/api/jobs`. Outbound URLs use fixed HTTPS provider hosts and a reviewed board catalog, never user-supplied fetch URLs. Only GET is used. Redirects, browser credentials, forwarded candidate headers and cookies are excluded. The resource rejects arbitrary/personal query parameters, duplicate parameters and mutations. Responses use JSON, no-store and nosniff; provider payloads/errors are not reflected in errors.

Requests have an eight-second upstream deadline and five-million-byte streamed response bound; the client has a twelve-second total deadline and 1.5-million-byte streamed bound. Both stop oversized reads. The service limits concurrency to four and admissions to thirty uncached requests/minute per process, caches only public pages for sixty seconds with at most sixty-four entries, and respects provider Retry-After cooldowns. It does not issue automatic retries through a rate limit; refresh/recheck is explicit. These local-process controls are not a distributed production rate limiter.

Private data uses `jp:v1:jobs:<owner UUID>:<event UUID>` in existing Puter KV. Immutable discovery, review and preference events carry schema/owner/parent/timestamps, are strictly validated on read/write, and are folded only from a complete single history chain. Wrong keys/owners, branches, missing parents, unknown receipts or stale identities fail closed. Same-origin Web Locks serialize mutations; fresh history/readback checks reconcile an unchanged event without blindly replaying a write. Review events do not duplicate full descriptions. Public snapshots are saved in batches of ten; successful earlier batches survive a later failure. Unconfirmed saves block subsequent actions until unchanged retry or reload.

Limits: 200 unique retained vacancies, 500 history events, 1.5 million serialized characters per event and 15 million aggregate history characters. Projected event/history capacity is checked before mutation. Existing history is retained when new writes are refused. There is no automatic pruning, broad wipe, history merge or deletion UI in this increment. Existing analyzer wipe does not touch profile/discovery data.

No CV contents, candidate skills, preferences, salary expectations or credentials are sent to public feeds or shared caches. Candidate preferences and review history remain private and are never serialized by SSR. No candidate localStorage was introduced. Actual Puter permissions remain the service authorization boundary; client owner fields alone cannot establish isolation.

## Verified failures repaired

Tests were added before the corresponding behavior changes where practical. Missing modules initially failed; focused implementation brought them green. Additional failing regressions reproduced and repaired:

1. Public discovery delivery originally checked only captured UI identity. It now revalidates SDK identity before returning data into account-dependent state, including out-of-band changes without focus events.
2. The client initially checked response size after reading the full body. It now enforces a streamed bound and cancels excess consumption.
3. Canonical Ashby application suffixes and later source-alias bridges could leave duplicates; groups now merge without resetting a dismissal. Job-ID query parameters remain distinct.
4. JavaScript date rollover could accept impossible source dates. Calendar validation now rejects them, and source parsing retains unknown rather than inventing a corrected publication date.
5. Fresh review reproduced false VERIFIED results for hiring outside SA, contrary German location, UK residency and negated/hybrid remote text. Conservative evidence rules and remote filtering were corrected; additional citizenship, right-to-work and residence regressions prevent related false verification.
6. A partial Greenhouse count could appear complete; mismatched total metadata now fails rather than establishing completeness.
7. Ashby unlisted postings could be mistaken for closed. Rechecks now retain uncertainty without revealing unlisted fields or claiming closure.
8. The production browser test found mobile overflow with long manual identifiers/native controls. Identifier wrapping and bounded select width repaired it; the mobile acceptance check subsequently passed.
9. URL-only manual records could disappear under role filters. Unknown-title imports now stay reviewable, with a regression and browser scenario.

The fresh reviewer independently reran 56 domain/source tests after the reported review fixes and found no remaining important issue in that follow-up. Subsequent narrow edge cases have focused regressions and are included in the full final suite. No reviewer made live account calls.

## Real-provider checks performed

Observed 27 October 2026, approximately 13:27 UTC, through the implemented server adapters (`milestone-2-provider-checks.json`):

- Greenhouse: HTTP 200, 18 normalized postings, all 18 with first-publication evidence; complete board. One public detail/pay-transparency request also returned 200. That detail disclosed no structured salary; the pay-band branch is verified with synthetic fixtures, not that live response.
- Lever: HTTP 200, zero postings on the configured provider-owned board. This confirms empty-board handling/connectivity; populated response and pagination behavior were tested with deterministic fixtures, not a populated live Lever response.
- Ashby: HTTP 200, 20 normalized postings on the first page, next offset 20; publication and salary metadata were present on those twenty. This does not claim every board page was fetched live.

All live requests were public GETs with credentials omitted. No production candidate document, account secret, job application or paid model call was involved. Live 429s, outages, closure and malformed responses were not provoked; those paths use fixtures. Public endpoint success does not prove that a particular employer accepts a South African applicant or that a submission form is currently usable.

## Environment notes and remaining release blockers

One tool batch was not executed when automatic approval review hit an account usage limit. After the user requested continuation, work resumed through the normal review path; no approval bypass was used. Existing restricted-environment loopback limitations require authorized host execution for type generation/build/HTTP/browser checks. Chrome was used from the installed bundled workflow; no browser download or deployment was performed.

**Full live isolation is NOT PASS.** Reverse A-to-B service access and account changes during real pending network operations remain release blockers. Controlled SDK tests and live delayed-consumer tests are not wire-level isolation proof. New profile/discovery KV records still need two-real-account live verification, including saved preferences and history. A stale mutation can have an unknown remote outcome; client guards do not certify atomic server ownership binding or cancellation.

Further release work includes cross-device nontransactional KV races/branch resolution, provider quotas at maximum history sizes, retention/erasure UX, deployment-origin/app identity, CSP/third-party SDK exposure, dependency audit, deployment headers and distributed request limiting. Same-origin locks do not cover other devices. Conflicts deliberately block edits; no global exactly-once or global transaction guarantee is claimed.

Eligibility rules are conservative lexical evidence checks, not comprehensive legal or semantic interpretation. Mandatory restrictions outside recognized forms may need manual review. IANA preferences and optional explicit overlap hints are supported, but exact working-hour/DST intersection belongs to later matching. Hourly conversion, FX, complete compensation-zone interpretation, employer headquarters verification and broad source coverage are not claimed. Missing salary/type/seniority/eligibility remain unknown; only validated disclosed ranges are normalized.

Only three catalog boards are initially enabled. There is no universal employer index or scheduled crawler. New boards/feed permissions need review. Personal data and production multi-user deployment remain outside authorization. Milestone 3 has not started.

## Changed files

New product modules:
- `app/features/jobs/boards.ts` — reviewed provider board catalog.
- `app/features/jobs/model.ts` — bounded normalized snapshots, dates and safe canonical URLs.
- `app/features/jobs/adapters.server.ts` — source-specific parsing and publication/pay provenance.
- `app/features/jobs/transport.server.ts` — bounded fixed-host public GET transport.
- `app/features/jobs/service.server.ts` — adapter dispatch, pagination, completeness, caching and cooldowns.
- `app/features/jobs/client.ts` — bounded public-route client with session revalidation.
- `app/features/jobs/eligibility.ts` — explicit restrictions, unknowns and status explanations.
- `app/features/jobs/preferences.ts` — profile-derived defaults and local filters.
- `app/features/jobs/dedup.ts` — stable aliases and review-preserving merges.
- `app/features/jobs/manual.ts` — safe URL recognition and unverified manual import.
- `app/features/jobs/repository.ts` — immutable owner-scoped private event persistence.
- `app/features/jobs/SearchEditor.tsx`, `JobCard.tsx` — editable filters and evidence cards.
- `app/routes/jobs.tsx`, `app/routes/api.jobs.ts` — private dashboard and public GET resource.

Modified integration: `app/routes.ts`, `app/components/Navbar.tsx`, `app/lib/validation.ts` (safe sign-in return), `scripts/ssr-smoke.mjs`, `scripts/http-smoke.mjs`.

New verification: `tests/jobs-domain.test.ts`, `jobs-sources.test.ts`, `jobs-repository.test.ts`, `jobs-security.test.ts`, `jobs-ui.test.tsx`, `jobs-route.test.ts`, `tests/fixtures/jobs.ts`; `scripts/jobs-provider-smoke.mjs`, `jobs-browser-smoke.mjs`, `test-job-feeds.mjs`. The last script is explicit test-only process preload, not a production/public import.

Documentation: `docs/superpowers/plans/2026-10-27-job-discovery.md`, this report copied to `docs/milestone-2-completion.md`, README usage and verification-gate notes.

## Reproduction

From `work/resume-analyzer`, Node 24:

```powershell
npm test -- --reporter=json --outputFile=../../outputs/milestone-2-tests.json
npm run typecheck
npm run build
node scripts/ssr-smoke.mjs
node scripts/http-smoke.mjs
git diff --check
```

Browser acceptance uses actual production routes/adapters with explicit synthetic upstream feeds and a controlled synthetic Puter SDK. Live feed access is separate:

```powershell
$env:JOBPILOT_PLAYWRIGHT_MODULE='<PLAYWRIGHT_MODULE_PATH>/index.mjs'
$env:JOBPILOT_BROWSER_EXECUTABLE='C:/Program Files/Google/Chrome/Application/chrome.exe'
node scripts/jobs-browser-smoke.mjs
node scripts/profile-browser-smoke.mjs
# Optional public GET smoke; does not log candidate data or submit applications:
node scripts/jobs-provider-smoke.mjs
```

For manual controlled review, run `npm run dev -- --host 127.0.0.1`, open the printed URL with `/jobs`, and sign in only through normal Puter UI. Use synthetic data while live isolation is unresolved. Browser scripts stop their own loopback servers; they do not deploy.

Final verification counts and screenshots are recorded below after the last checks.

## Final verification results — 28 October 2026

| Check | Actual result | Evidence |
| --- | --- | --- |
| Full automated suite | PASS: 228 passed, 0 failed | `milestone-2-tests.json` |
| Original test preservation | PASS: all 144 baseline assertions retained and passing, compared by file path + full assertion name | `milestone-2-baseline-comparison.json` |
| Added focused tests | 84 cases: domain 41, source 20, private repository 7, guarded ownership/client security 6, dashboard 5, resource route 5 | Six `jobs-*.test` suites |
| TypeScript | PASS, exit 0 | `npm run typecheck` |
| Production build | PASS, exit 0; 109 client / 49 SSR modules | `npm run build` |
| SSR | PASS: 7 routes; protected pages render private loading shells | `node scripts/ssr-smoke.mjs` |
| HTTP | PASS: 15 checks (loopback control, 7 routes, 2 static assets, 3 removed sample CV images, unsafe URL rejection and mutation rejection) | `node scripts/http-smoke.mjs` |
| Discovery production browser | PASS: 12 scenarios; zero uncaught page errors | `milestone-2-browser.json` |
| Existing profile production browser | PASS: all 9 scenarios after discovery integration | `milestone-1-browser.json` |
| Diff whitespace | PASS, exit 0; existing line-ending conversion warnings only | `git diff --check` |

The build retains a nonblocking unused React default-import warning. The empty client chunk for the server-only API resource is expected. No test failure was treated as success. Earlier failed regressions/mobile runs were repaired and the final complete checks passed.

Browser verification used actual production React Router/CSS/client/resource/adapters with synthetic upstream provider fixtures, synthetic Puter identity/KV transport, real Chrome and a real browser PDF worker for the profile regression. It is not live Puter isolation proof. Only the separately recorded provider smoke used live public endpoints.

### Screenshots (synthetic data)

- [Initial desktop discovery dashboard](milestone-2-dashboard-initial.png): recent source-backed evidence and explicit unknown publication status.
- [Desktop review / failure-state dashboard](milestone-2-dashboard.png): retained outage evidence and safe manual imports.
- [Mobile dashboard](milestone-2-dashboard-mobile.png): bounded layout including long manual identifiers.

Milestone 2 is ready for local review. Milestone 3 remains unstarted. Full live account isolation remains an OPEN release blocker. No application, push or deployment occurred.
