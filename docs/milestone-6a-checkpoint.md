# Milestone 6A — Discovery and network-verification checkpoint

30 October 2026. Synthetic local development only. Real-data use, private deployment and public deployment remain **BLOCKED**. No Puter sign-in requested during this checkpoint; no applications, employer emails, push or deployment.

## Discovery diagnosis

The original 89-record snapshot is preserved and evaluated at its original timestamp, 2026-10-30T09:03:13.147Z. Its counts remain 6 fresh, 83 stale, 0 missing dates, 0 explicit SA-eligible, 0 explicit SA-ineligible and 89 UNKNOWN. Eight titles match the existing defaults; 81 do not. Twenty-seven titles explicitly indicate Senior/Lead/Staff/Principal against the authorized synthetic 2–4-year target; 62 have no recognized seniority. No salary exclusions, confirmed closures or duplicates were recorded. These are overlapping counts, not an additive exclusion funnel. Availability is a feed snapshot, not proof an application can still be submitted.

The source text contains **zero mentions of South Africa**. Fifty-two records have regional remote-location labels (US, Canada or European Union); five contain `must be legally eligible to work` wording. The adapters preserved those fields. Missing affirmative SA evidence is a feed/catalog coverage problem. Failure to surface regional evidence and recognize the authorization wording was a parser limitation; both are repaired without converting regional hints into definitive eligibility or exclusion.

Explicit SA hiring locations and an explicit permitted-country list can now supply location evidence. Personal work authorization remains unresolved until verified. A lack of authorization in one optional country does not invalidate all other country choices. Publication age remains independent. Customer-country mentions and worldwide/EMEA alone remain UNKNOWN. Manual imports with unknown eligibility remain available for review.

A live Workwize description exposed another defect: a Netherlands-only pension benefit was interpreted as a hiring restriction. The scoped repair preserves that benefit context. An existing regression also caught contradictory `hiring outside South Africa` wording during implementation; it was corrected before final verification. Initial red tests and intermediate failing full-suite artifacts remain available, rather than silently discarded.

## Confirmed sources and catalog

- **KoBold Metals — Greenhouse `koboldmetals`.** [Employer careers](https://koboldmetals.com/careers/) links directly to the [global board](https://job-boards.greenhouse.io/koboldmetals). Its [Software Engineer, All Levels](https://job-boards.greenhouse.io/koboldmetals/jobs/4510145005) lists SA among permitted work-authorization countries. This is conditional geographic consideration, not confirmation of the candidate's authorization. Python is central; React is a nice-to-have. Qualification is evaluated separately.
- **Workwize — Greenhouse `workwize`.** [Employer careers](https://www.goworkwize.com/careers) embeds `https://boards.eu.greenhouse.io/embed/job_board/js?for=workwize`. The [QA Engineer vacancy](https://job-boards.eu.greenhouse.io/workwize/jobs/4875847101) explicitly allows Europe or SA, remote hiring and CET hours, while retaining sponsorship caveats. This role requires QA experience and is not a frontend qualification match merely because it mentions React. The application destination validator accepts this board's exact EU host/path only; arbitrary hosts and other board paths remain rejected.

The existing public Greenhouse adapter successfully retrieved both boards through its reviewed public API. No restricted platform or access control was bypassed. Employer-country fields remain unknown; no headquarters location or blanket employer-wide SA eligibility is invented. Other research candidates were not added without a sufficiently verified compatible source.

| Snapshot | Listings | Fresh | Stale | SA location consideration | SA unknown | Fresh and SA considered | Fully verified |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Original three boards | 89 | 6 | 83 | 0 | 89 | 0 | 0 |
| KoBold | 29 | 1 | 28 | 6 | 23 | 0 | 0 |
| Workwize | 19 | 3 | 16 | 1 | 18 | 0 | 0 |

The two new snapshots add 48 postings, including seven with explicit SA consideration. All seven are older than seven days. These snapshots were retrieved separately from the original 89 and must not be represented as one simultaneous 137-listing live scan. There are still **zero verified recent SA matches**. Five configured boards improve breadth, but do not establish adequate React/Next.js/TypeScript 2–4-year coverage.

Evidence: `milestone-6a-discovery-original-parser.json`, `milestone-6a-discovery-revised-parser.json`, `milestone-6a-eligibility-gap.json`, `milestone-6a-expanded-discovery.json`, public raw snapshots and Workwize ownership JSON in outputs.

## Revised network checks

**Observer calibration: PASS. Live Puter isolation: NOT TESTED / BLOCKED.**

Four unit tests distinguish a pending SDK promise, a request with no observed bytes, transferred bytes, identity-change timing and request settlement. The observer exports counts only; it does not collect headers, bodies, tokens, paths or account identifiers. Endpoint admission is an explicit caller-supplied origin/path predicate.

A separate headless Chrome calibration made an actual loopback XHR transfer: bytes arrived while the HTTP response remained open, then a synthetic identity-change timestamp was recorded, then the request completed. It also verified excluded traffic was not counted. This validates browser event instrumentation, **not** Puter account isolation. The local stream and simulated identity timestamp are not substituted for a live pending Puter request.

The production SDK's public code was inspected and contains native XHR paths for file reads, batch uploads and driver calls. That alone does not prove every target operation is observed. The old account harness has **not** been promoted to a verified network harness. Wiring the observer to exact target operations, excluding authentication/preflight/unrelated traffic, confirming the execution context, and auditing both owner namespaces after settlement remain required before fresh A/B instructions. Local document rendering has no Puter network transfer by itself and must be reported separately. No historical SDK-promise overlap is upgraded to wire evidence.

Evidence: `milestone-6a-network-calibration.json`, `tests/network-evidence.test.ts`, `scripts/release-network-calibration.mjs`. Do not restart the old manual retry sequence on the strength of this calibration.

## Verification and release position

Final automated results are recorded alongside this report after the final source-state checks finish. No dependency version or lockfile changes were made in this checkpoint. Production npm audit reports zero advisories. Native Word verification, genuine live in-flight Puter isolation and adequate discovery coverage remain blockers. Native document rendering was not changed or newly certified here.

This is the requested **checkpoint before further live work**, not a Milestone 6A completion or release approval. No readiness category is promoted.


### Final checkpoint results

- **410/410 automated tests PASS**; multiset comparison confirms all 395 baseline assertions remain present and passing (15 new assertions).
- TypeScript PASS; production build PASS. Existing bundle-size/unused-import warnings remain; no new build failure is hidden.
- 10 SSR checks PASS; 23 HTTP checks PASS; 12 discovery and 13 application browser checks PASS, using controlled synthetic SDK/provider responses. These browser checks are not live Puter isolation evidence.
- Actual Chrome/loopback transfer calibration PASS; four network evidence unit tests PASS. Live Puter target-operation correlation and account switching remain BLOCKED / NOT TESTED.
- Production npm audit: **0 reported vulnerabilities**. No dependency edits.
- Independent focused review: no actionable findings; reviewer independently ran 15/15 focused assertions. Reviewer did not claim live Puter, native Word or external source verification.

Final evidence: `milestone-6a-tests-verified.json`, `milestone-6a-baseline-preservation.json`, `milestone-6a-typecheck.log`, `milestone-6a-build.log`, `milestone-6a-ssr.log`, `milestone-6a-http.log`, `milestone-6a-jobs-browser.log`, `milestone-6a-applications-browser.log`, `milestone-6a-production-audit.json`.

### Files changed during this checkpoint

Production: `app/features/jobs/eligibility.ts`, `app/features/jobs/boards.ts`, `app/features/applications/destination.ts`. Tests: `tests/discovery-evidence.test.ts`, `tests/network-evidence.test.ts`, and the explicitly empty new-board fixtures in `scripts/test-job-feeds.mjs` (the original three-source acceptance case remains unchanged). Verification/analysis: `verification/network-evidence.ts`, `scripts/release-network-calibration.mjs`, `scripts/release-discovery-diagnosis.mjs`, `scripts/release-expanded-discovery.mjs`. Documentation: this checkpoint report and the existing Milestone6A plan. Public snapshots, analysis JSON and verification logs are in outputs.

The accepted workspace already contained earlier uncommitted milestones; those files were not reset, staged, committed or pushed as part of this checkpoint. Historical intermediate red test reports are distinct from the final verified run.
