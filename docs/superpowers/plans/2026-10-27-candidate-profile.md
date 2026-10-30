# Candidate Profile Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans task by task. User authorized local execution of Milestone 1; stop before Milestone 2.

**Goal:** A private, editable, evidence-backed candidate profile from a master PDF.

**Architecture:** Reuse React Router, Puter guarded KV, PDF.js and PrivateBoundary. Deterministic extraction proposes literal source claims; candidate review establishes confirmation. Immutable revisions contain bounded source text/page spans and SHA-256, explicit owner and parent revision. No AI calls, public files, localStorage or server candidate loaders.

**Tech Stack:** Existing React/TypeScript/Tailwind/Puter/PDF.js; no dependencies or migration.

**Spec:** ../specs/2026-10-23-jobpilot-design.md, Milestone 1; user authorization 27 October.

## Global constraints

- Preserve 106 tests and working analyzer. No push/deploy/submission/discovery.
- Full live isolation is unverified and remains a release blocker.
- CV-backed confirmation is candidate confirmation, not independent verification.
- Unknown proficiency/dates remain empty; employment, freelance, projects stay separate.

## Implementation rulings

- The original PDF stays in browser memory; persist bounded extracted text and original byte hash only, avoiding new raw-file upload/recovery transactions. User retains the original PDF. Explain this before save. This refines the proposed source-storage scheme for this milestone.
- One active master profile per account, immutable revision DAG; no mutable head pointer. Enumerate all revisions and block saving on conflict. Web Locks required for writes, with fresh revision checks inside lock. Cross-device races can create branches; detect on next read, fail closed for further edits. No global transaction claim.
- Literal section/line parsing is deliberately conservative. Unknown layout remains available as source text for manual evidence selection. No invented totals, inferred seniority, education, certificates or proficiency. Manual corrections outside the source require a reason and remain clearly candidate-attested, never CV-backed.
- No commits while the existing mixed staged/unstaged stabilization work remains under review.

## Review focus

1. Source tampering: reject broken page/hash/span/quote bindings on read and write.
2. Category correction: changing values/kind/evidence clears confirmation; dates validated without guessing precision.
3. Identity change across async extraction/load/save: captured session checked at every boundary; private content unmounts.
4. Ambiguous persistence/concurrent edits: immutable same-ID readback reconciliation; no blind retries/head overwrite.
5. Empty/scanned/encrypted/huge CVs: fail clearly, recover without replacing current draft.

## Tasks

### 1. Schema and evidence rules
- [x] Write failing profile-domain tests for literal extraction, unsupported claims, corrections, dates and preferences.
- [x] Implement `schema.ts`: Source, Claim, Preferences, ProfileRevision; strict bounded parsing, evidence verification, confirmation reset.
- [x] Implement `extract.ts`: all-page bounded PDF.js text extraction, source hash, conservative section-aware suggestions.
- [x] Run focused real PDF and domain tests.

### 2. Private persistence
- [x] Write failing repository tests for signed-out/cross-owner/stale operations, conflicts, failed receipts and readback reconciliation.
- [x] Implement `repository.ts`: guarded Puter adapter plus captureSession, owner-specific keys, immutable revisions, Web Lock and fresh leaves check. Never overwrite an existing revision.
- [x] Run repository tests with controlled transport plus real guard regression suite; do not claim new live isolation.

### 3. Profile editor
- [x] Write failing component tests for protected state, import/review/edit/confirmation, preferences, save/load and account-switch privacy.
- [x] Add `/profile` private route and navbar link, safe auth return path; source evidence selector, structured employment/freelance/project/skill fields, candidate attestations, preferences and revision state.
- [x] Failed imports/saves retain the current draft for the same session; no stale result can replace the next account's view.
- [x] Run component tests and browser acceptance using synthetic fixtures and a clearly identified controlled SDK transport.

### 4. Verification and handoff
- [x] Full tests JSON plus original 106 assertion comparison; TypeScript, build, SSR/HTTP checks.
- [x] Browser acceptance: actual route/import/parser, evidence confirmation, save/reload, invalid PDF recovery, account-switch rejection and signed-out privacy. Distinguish controlled SDK from live service.
- [x] Fresh review, repair important defects with regressions, report changed files/results/risks and stop.
