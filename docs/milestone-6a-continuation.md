# Milestone 6A continuation — controlled verification report

30 October 2026. No real candidate data, employer submissions, emails, automatic applications, push or deployment. This report concerns harness preparation and discovery improvements; it does not certify live Puter isolation.

## Network harness

The local harness now invokes actual production guarded Puter operations for private file reads, named 2 MiB synthetic uploads, approval validation, approval persistence and approved-document preparation. The optional synthetic auxiliary deletion test targets the SDK's `/delete` endpoint. Instrumentation admits only the selected target SDK call and its exact endpoint; authentication requests and unrelated calls are excluded. Uploads additionally use the documented SDK `init` request handle. No headers, payloads, authentication tokens, cookies, account identifiers or private paths are exported.

Automatic sign-out now waits for an actual nonzero transfer progress event. A pending SDK promise alone cannot trigger sign-out or establish overlap. A different **verified SDK account** must be observed after bytes transfer and before request settlement. Completion before the switch is NOT TESTED. SDK/transport errors without captured-session rejection are BLOCKED. Accepted stale results are FAIL. Observed pending transport or a dispatched but unsettled target SDK call blocks Finish and cleanup. The generation pipeline first loads the owner-bound private preparation through the production repository, then renders locally. Only the private preparation read supplies Puter-network evidence; the local rendering phase makes no transfer claim.

The operation must still be tested with real disposable A/B accounts. Preparation verifies instrumentation, not future live outcomes. Browser throttling may make a real transfer long enough to observe; it must not extend production deadlines, hold consumer results artificially, or be represented as a mocked race. Fast completed requests may legitimately remain NOT TESTED. No repeated blind retries are authorized by a PASS elsewhere.

After each settled race, A/B audit buttons verify the captured SDK owner and inspect private namespace ownership plus dedicated auxiliary files. Recognized A-only upload bytes in B are FAIL; ambiguous entries are BLOCKED. These remain snapshot checks, not guarantees about future writes. Cleanup is restricted to captured synthetic records, exact original PDF hashes and recognized bounded run-specific auxiliary bytes. No broad deletion or flush.

Deterministic verification passed: selected-call correlation, endpoint exclusions, stale-result classification, exact synthetic byte recognition, both-account fixture workflow, both-owner audits, exact cleanup and an intentional foreign-read fault. A completed synthetic SDK promise did not trigger sign-out and did not receive a network PASS. Chrome also passed genuine loopback HTTP-transfer calibration. Neither synthetic SDK tests nor loopback calibration is claimed as real Puter isolation evidence.

Independent review found the optional deletion operation was incorrectly mapped to a KV reader. The public SDK confirms `/delete`; a failing regression reproduced the omission, then the mapping was repaired. No further concrete false-PASS or cleanup-safety finding was reported.

## Browser access — externally confirmed by the user

Port 5175 initially had a listening but stalled server. Automated browser checks timed out; those failed attempts are retained. Its identified harness process was restarted in the Windows user context. Windows HTTP and headless Chrome subsequently loaded the correct page and the integrated smoke checks passed. **The user's Codex in-app browser still reported ERR_CONNECTION_TIMED_OUT.** Its accessibility is therefore not marked PASS.

A foreground server on fresh loopback port 5176 returned HTTP 200 with the expected Milestone6A heading in a separate Windows check. The user subsequently confirmed this page opens in an external Windows browser. External access is therefore user-confirmed PASS; Codex in-app access remains unverified. The first fresh A/B step can be requested after final harness checks complete. No public tunnel, firewall change or deployment was made.

If the external browser also fails, run this in a normal PowerShell window on the user's Windows computer, leaving that window open:

```powershell
Set-Location -LiteralPath '<REPOSITORY_ROOT>'
$env:JOBPILOT_HARNESS_PORT='5185'
node verification/serve-release-harness.mjs
```

Then open `http://127.0.0.1:5185/verification/release-account-harness.html` in external Edge/Chrome. The terminal must show that exact local address. If `node` is unavailable, use `& 'C:\Program Files\nodejs\node.exe' verification/serve-release-harness.mjs`. This is a local server, not deployment. Stop only that server with Ctrl+C after both accounts have been cleaned. Do not reuse an old run or refresh a page containing live captured fixture references.

## New employer sources

Three boards were added in this continuation (five were already configured):

- **Supabase / Ashby `supabase`:** [official careers](https://supabase.com/careers) directly links to `jobs.ashbyhq.com/supabase/...`. Globally remote statements are retained as UNKNOWN SA eligibility unless a specific role supplies affirmative country evidence.
- **Oyster / Ashby `oyster`:** [official careers](https://www.oysterhr.com/careers) embeds `https://jobs.ashbyhq.com/oyster/embed`. Worldwide policy is not blanket role eligibility.
- **Sourcegraph / Greenhouse `sourcegraph91`:** [official jobs](https://sourcegraph.com/jobs) links to the [current engineering vacancy](https://job-boards.greenhouse.io/sourcegraph91/jobs/6185008004). The board identifier is `sourcegraph91`, not a guessed employer slug. This staff-level role's timezone overlap does not establish SA eligibility or a 2–4-year qualification fit.

Buffer currently advertised no openings and was not added. Other researched employers were not added without a current compatible employer-owned board. Existing compliant ATS adapters are retained; no restricted-platform scraping or access-control bypass.

## Current live discovery measurement

All eight configured boards completed a fresh public GET scan. These are current live public records, not the previous saved89 or synthetic fixtures. Snapshot and per-vacancy reasons: `milestone-6a-cont-discovery.json`; full normalized records: `milestone-6a-cont-live-jobs.json`.

| Board | Live listings |
| --- | ---: |
| Sourcegraph | 6 |
| Oyster | 23 |
| Supabase | 64 |
| Workwize | 19 |
| KoBold | 29 |
| Greenhouse | 18 |
| Lever | 0 |
| Ashby | 71 |
| **Unique total** | **230** |

- **4** have provider-reported original/first posting dates within seven days; all4 have UNKNOWN SA eligibility.
- **15** have recent **last-publication** dates, but unknown original posting dates. They are not counted as fresh original postings. Updates are not substituted for originals and the seven-day window is unchanged.
- **14** explicitly consider SA at the location level, all stale. Personal work authorization or other mandatory conditions remain separately unresolved. This is not 14 fully qualified applications.
- **0** meet both recent original posting and confirmed SA geographic consideration; **0** accepted for a manual shortlist under the complete evidence rules.
- **0** explicitly SA-ineligible outcomes from the current parser; no negative conclusion is inferred from absent affirmative evidence.
- **0** confirmed closed roles in the retrieved feed snapshots. Historical closure is NOT TESTED. **158** have unverified original posting dates; this category overlaps other counts.
- **52** have developer/engineer title plus a target technology/role intersection. **31** lack an explicit seniority or required-years mismatch; **16** additionally have an explicit required-years value within2–4. These are disclosed preference probes, not qualification scores or claims about a real candidate profile.
- **5/5** selected promising destinations returned HTTP200 at their exact validated official application URL using GET only. Remaining225 destinations were NOT individually tested; feed presence is not a full application-form acceptance test. No form was filled or submitted.

The4 fresh-original vacancies were Workwize IT Systems Administrator, Partnerships Lead and Revenue Operations Specialist, plus KoBold Senior Applied Scientist. They were excluded from the target candidate shortlist by technical/seniority/geographic evidence, rather than being promoted just because they were fresh.

Promising vacancy decisions:

- **Supabase Software Engineer (Ruby on Rails, APIs), Software Engineer—Storage and Support Engineer (APAC—Weekends):** exact official destinations responded200 and technology overlap was present, but original dates and SA eligibility remain unknown. APAC wording is not SA permission. Retained for review, not accepted as fresh confirmed matches.
- **Workwize QA Engineer:** SA location permission and CET hours are documented, but it is stale and requires QA experience; sponsorship caveats remain. It is not a frontend match just because React appears.
- **KoBold Software Engineer (All Levels):** SA is in the permitted-country list, but the posting is stale, legal work authorization is unresolved and Python is central. The role cannot be accepted as a new React vacancy.
- **Sourcegraph ML & Agentic Systems Engineer:** technically relevant infrastructure/TypeScript context, but explicitly staff-level, unknown SA permission and no recent-original-date evidence. No fabricated seniority compatibility.

No personal CV was loaded for this analysis. Unknown/manual vacancies remain reviewable. The useful-coverage gap remains: more records did not produce a fully verified recent SA match.

## Release position and outstanding work

Controlled synthetic local development remains the only accepted use. Real-data local use, private deployment and public multi-user deployment remain **BLOCKED**. Live pending-operation A/B isolation is **NOT TESTED**, and external user browser access is **PASS by user confirmation** (in-app browser remains unavailable). Native Word/DOCX visual acceptance and live paid-model behavior remain explicitly outstanding; no new claim is made for either.

Final test evidence is appended below after the last source-state verification. Nothing pushed, deployed or submitted.


## Final verification

- **418/418 tests PASS**, preserving all410 prior passing assertions by name/multiplicity comparison. Eight new assertions; original prior milestones remain included. Evidence: `milestone-6a-cont-tests-accepted.json` and `milestone-6a-cont-baseline-preservation.json`.
- TypeScript PASS, production build PASS,10SSR and23HTTP checks PASS. Existing bundle-size/unused-import warnings remain.
- All55 baseline browser checks PASS: profile9, discovery12, matching10, preparation11, applications13. Synthetic SDK/provider scenarios only; not live account isolation evidence.
- Integrated harness fixture/owner/audit/cleanup workflow PASS; no false overlap for a completed SDK promise. Intentional foreign-read fault test PASS. Real Chrome loopback calibration PASS. Live A/B operations remain NOT TESTED.
- Production audit: zero reported vulnerabilities; dependencies/lockfile unchanged during this continuation.
- Focused review/re-review complete; deletion mapping finding repaired and regression-tested.
- User confirmed external browser accessibility on port5176. In-app browser failure remains documented. Native DOCX visual and paid-model tests remain outstanding.

New/changed files in this continuation: `verification/target-network.ts`, `verification/network-evidence.ts`, `verification/release-account-harness.js`, `verification/release-account-harness.html`, `verification/serve-release-harness.mjs`, `tests/target-network.test.ts`, added cases in `tests/discovery-evidence.test.ts`, `app/features/jobs/boards.ts`, `scripts/release-discovery-quality.mjs`, `scripts/release-harness-smoke.mjs`, `scripts/test-job-feeds.mjs`, optional non-conflicting port in `scripts/profile-browser-smoke.mjs`, plan and this report. Public snapshots/ownership evidence and logs are in outputs. Accepted pre-existing dirty files were not reset or committed.

The next authorized step is **one fresh normal-UI sign-in to disposable Account A** in the confirmed external browser at `http://127.0.0.1:5176/verification/release-account-harness.html`. Do not create fixtures or start races until guided. No credentials, tokens or cookies are requested. Account labels are assigned only after fixture creation verifies the SDK owner; an initial unassigned label is expected. This report stops for review/live user participation; it does not mark Milestone6A live isolation complete.
