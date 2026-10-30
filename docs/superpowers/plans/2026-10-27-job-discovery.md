# Job Discovery Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans task by task. User authorized local Milestone 2. Stop before Milestone 3. No pushes/deployments/submissions.

**Goal:** Public ATS discovery, explicit evidence/unknowns, private saved review states and safe manual imports.

**Architecture:** Existing React Router resource GET route -> fixed-host public adapters -> bounded normalized snapshots. Private UI filters locally using profile preferences; no profile data is sent to feeds. Existing guarded Puter + captureSession persist immutable owner-scoped discovery revisions with Web Locks/conflict detection. No new dependencies or migration.

**Spec:** 2026-10-23 JobPilot design Milestone 2 and user's pasted authorization dated 27 October.

## Decisions within authorized scope
- Implement Greenhouse global, Lever global and Ashby public APIs; initial configured boards are the providers' own public company boards. Extend a reviewed static board catalog rather than accepting arbitrary fetch hosts/board URLs. No restricted scraping or authenticated ATS API.
- Publication fields retain provenance: Greenhouse first_published (detail), Ashby publishedAt (last publication), Lever UNKNOWN. Updated time never becomes published time. Missing/future/invalid dates remain unverified.
- Availability means observed public posting, not tested submission acceptance. Missing from a partial page or failed feed is never proof of closure. Individual 404 (GH/Lever) or absence from a fully valid complete Ashby board can confirm closed.
- VERIFIED means current listed remote posting, recent documented publication, and explicit location/SA compatibility with no unresolved mandatory restriction. Optional salary absence does not block it. UNVERIFIED retains unknowns; INELIGIBLE needs affirmative incompatibility; EXPIRED requires closure/deadline; SOURCE_ERROR retains prior snapshot after failed recheck.
- Conservative literal eligibility rules show supporting excerpts. Worldwide alone, ambiguous regions, ordinary office locations and missing authorization remain UNKNOWN. Work-authorization failures require a candidate's explicit declaration that they lack the required authorization. No fit percentages.
- Salary targets default USD3000/month full time and USD1500/month part time; profile salary/preferences override defaults. Optional salary filtering retains undisclosed/incomparable data. No FX conversion.
- Canonical URL identity preserves job-ID parameters and strips known tracking only. Stable source aliases plus canonical URLs deduplicate; refreshed postings never reset review status. No automatic employer contact.
- Manual URLs: only recognized catalog ATS URLs can invoke GET adapter; other safe public HTTPS links are stored as UNVERIFIED with pasted description, never fetched. Reject local/IP/credential/non-HTTPS links. Descriptions are inert text, never HTML.
- Private discovery history bounded like profile history. Cross-device nontransactional KV remains a release limitation; local locks and detected branches fail closed.

## Tasks / tests
1. [x] Domain: `model.ts`, `eligibility.ts`, `preferences.ts`, `dedup.ts`, `manual.ts`; tests for dates, missing salary, explicit/ambiguous SA restrictions, authorization, onsite, expiration, URL canonical identity, manual SSRF defense and search filters.
2. [x] Public adapters: `boards.ts`, `adapters.server.ts`, `transport.server.ts`, `service.server.ts`, `routes/api.jobs.ts`; synthetic malformed/pagination/rate/timeout/oversize/redirect/outage/closure tests. GET only, fixed hosts, no forwarded credentials, bounded cache/rate/concurrency; fail partial instead of inventing completeness.
3. [x] Private `repository.ts`: immutable guarded discovery revisions; tests for owner/key mismatch, stale reads/writes, conflicting revisions, ambiguous save readback, dedup + review retention and projected size limits.
4. [x] `/jobs` route, preferences/dashboard/manual form/cards, profile/nav integration; component and actual production browser acceptance with synthetic SDK/feed transport, mobile screenshot, hostile description, review reload, outage retention/account switch.
5. [x] Real public-provider GET smoke using actual adapters, record only counts/field coverage/HTTP results. Full original144 comparison, TypeScript/build/SSR/HTTP, fresh code review/regressions, completion report/screenshots and stop.

## Review focus
SSRF and redirect handling; false publication/closure from partial feeds; false eligibility from a location or negated prose; review reset across source updates; private preferences in public routes/logs; account changes at each await; bounded storage before writes.

## Source research
- https://docs.greenhouse.io/job-board — public unauthenticated GET list/details; first_published in details; updated_at distinct.
- https://github.com/lever/postings-api — published GET lists/details; skip/limit pagination, country/workplace/salary optional, no documented publication date. Hosted form links only; no application POST implemented.
- https://developers.ashbyhq.com/docs/public-job-posting-api — public listed postings; isListed filter; isRemote includes hybrid, so use workplaceType; publishedAt is last publication, not necessarily original publication.

Public endpoint documentation is not a blanket license for every employer or future use. Only configured public boards are enabled; respect outages/rate limits and review any additional board/feed terms before expanding.
