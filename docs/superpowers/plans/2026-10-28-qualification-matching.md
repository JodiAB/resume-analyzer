# Evidence-Based Qualification Matching Implementation Plan

> Use superpowers:executing-plans in this session, with TDD and fresh review. User authorized Milestone 3 only. Stop before tailoring, pushes, deployment or submissions.

**Spec:** User's 28 October Milestone 3 authorization and existing JobPilot design. Preserve original 228 tests, profile/discovery architecture and unresolved live isolation release blockers.

## Decisions

- Deterministic gate runs before scoring and before any model request. PASS/FAIL/UNKNOWN checks produce ELIGIBLE/INELIGIBLE/UNKNOWN. Technical scores can be shown for blocked jobs, but cannot override eligibility or mandatory salary/hours conflicts. UNKNOWN stays manual review.
- Fixed, configurable 100-point rubric: skills35, relevant experience25, projects15, seniority10, responsibilities/domain10, secondary qualifications5. Unknown evidence earns no confirmed points and reduces evidence coverage/confidence, never implies actual inability. No reweighting of unknown criteria; disclose this conservative lower-bound scale. Thresholds90/80/70 are editable and never hiring probabilities.
- CV-backed candidate-confirmed claims only support verified qualification points. Attestations/unconfirmed claims remain visible limitations, not invented skills. Explicit candidate declarations of gaps, complete history, authorizations and constraints are separate labeled inputs, never AI-generated profile facts.
- Commercial employment excludes personal projects and explicitly unpaid/volunteer records. Professional history adds only explicitly paid freelance; hands-on includes relevant verified project/freelance work. Union calendar intervals; lower bound full covered months, upper bound touched months; partial/missing dates stay uncertain. Do not sum overlapping categories. Exact role seniority comes from stated evidence, not inferred years.
- Requirements are bounded source spans with IDs, required/preferred/unspecified importance, technologies/experience/credentials/tasks. Unsupported mandatory conditions stay unresolved. Exact skill aliases and a small documented transfer map are deterministic; transferable practice gets at most half credit, never satisfies a hard exact requirement automatically.
- Salary and time-zone constraints are separate. Same-currency monthly/yearly comparison only; absent or crossing bands are UNKNOWN. Parse only explicit job windows with IANA zones. Minute-level weekday overlap is evaluated for the next seven dates with Intl/DST; unsupported/overnight/ambiguous windows remain UNKNOWN. No salary/time points.
- Puter AI is explicit opt-in, with private excerpt/cost disclosure, no tools or attachments. Up to40 confirmed claim labels and <=20k job characters, <=60k total prompt; <=30k response; strict schema/citation checks. AI selects evidence links/context; unsupported transfer proposals remain unscored context. No free-form factual prose, numerical score or eligibility override is accepted. Invalid/refused/truncated/tool responses fail closed; no automatic paid retry.
- Immutable private results bind owner, exact profile hash/revision, job hash, config/rubric and date. Service reloads inputs after async AI and before save. Changes invalidate old results; dashboard hides stale scores. 24h result expiry. Guarded Puter KV and Web Locks, bounded readback reconciliation; no migration or mutation of discovery history.
- Separate private `/match/:source/:board/:jobId` workbench selected from job cards, plus dashboard summaries/sorting/filtering. Manual shortlist/dismiss uses the existing discovery event repository.

## Tasks

1. [x] `matching/{types,requirements,experience,engine,constraints}.ts`: failing deterministic tests for exact/transfer gaps, source spans, dates/unions, categories, mandatory gates, confidence, rubric/thresholds, salary/DST and source disagreement.
2. [x] `matching/{semantic,repository,service}.ts`: failing controlled model/ownership tests, prompt injection, strict citations, stale profile/job/account/rubric, immutable persistence and unknown save outcomes. Extend existing Puter option types only for documented JSON output/normalization.
3. [x] Private workbench/components and discovery summary hook; failing UI tests for selecting, analysis, evidence, config, safe explicit AI, profile invalidation and preserved review actions. No interference with source feed routes.
4. [x] Actual production browser with synthetic profile/job/SDK/model fixtures; no paid/live personal model calls. Preserve existing browser flows. Full228 comparison, TypeScript/build/SSR/HTTP, fresh review and fixes, completion report/screenshots and stop.

## Review focus

False eligibility from unknown mandatory facts; overlapping/partial/current dates; unrelated or negated skill evidence; AI schema/citation correctness versus semantic truth; stale context at every await; private results in public feeds; false confidence from sparse descriptions; DST boundary/overnight limitations; immutable capacity before writes; preserving discovery review history.

Puter structured-output options were researched from https://docs.puter.com/AI/chat/ and response format from https://docs.puter.com/Objects/chatresponse/. Provider support/live model behavior remains a separate verification item; client validation is authoritative regardless of provider formatting guarantees.
