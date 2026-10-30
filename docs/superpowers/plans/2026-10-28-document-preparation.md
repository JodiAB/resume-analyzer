# Evidence-Based Document Preparation Implementation Plan

> Execute inline using superpowers:executing-plans and test-driven-development; fresh whole-feature review before completion. User authorized Milestone4 only; no commit/push/deployment/submission.

**Goal:** Prepare truthful editable, versioned CVs/cover letters for assessed shortlisted jobs with private previews and verified PDF/DOCX downloads.
**Architecture:** Reuse profile, matching bindings, guarded Puter KV and React Router. Canonical evidence-backed draft model renders locally to plain text, DOCX and selectable-text PDF. No employer-facing candidate API or authentication/storage migration.
**Spec:** User's Milestone4 attachment `619d3ab2-e2cf-4162-a9bb-1244e478939c/Pasted text.txt` plus existing design/security boundary.

## Decisions and rationale

- Continue existing local checkout: accepted prior milestones are uncommitted and must remain available; do not reset or create a clean checkout that drops them. Preserve291 baseline assertions.
- Use docx + pdf-lib/fontkit and bundled Noto Sans for deterministic browser generation. Alternatives: server conversion would introduce private server uploads; browser print would not ensure actual downloadable PDF bytes. Neither is necessary. Font glyph gaps block export instead of silently losing characters. Use standard single-column headings, source-preserved dates, normal text, no images/hidden keywords/macros.
- `features/preparation/{model,evidence,semantic,render,repository,service}.ts`, focused UI components and private `/prepare` route. Link job assessments to preparation; show shortlisted jobs and immutable draft history.
- Drafts bind identity, profile revision/hash, complete job snapshot/hash, assessment ID/config/preferences and generation timestamp. Store bounded immutable source snapshots/draft evidence under private `jp:v1:prep:<owner>:<id>`; originals remain untouched. No generated binaries uploaded: derive on-demand locally from the validated record, verify SHA-256/download content and revoke blob URLs. Web Locks/readback prevent blind duplicate saves. Context and preview/session guards before/after async work and every save/download.
- Only confirmed CV-backed source claims appear as verified qualifications. Keep commercial employment, explicitly paid freelance, other freelance (payment unverified), independent projects, credentials and skills separate. Preserve every included work item's original dates and kind; do not infer durations/proficiency. Unverified/developing claims remain visible outside verified export.
- AI is opt-in with exact preview and potential-cost disclosure. It returns selected claim IDs and literal evidence excerpts, plus bounded summary/cover template choices; no unrestricted factual prose accepted. Deterministic templates perform source-backed rewriting without adding achievements/metrics/leadership. Reject any quote not in its cited confirmed source. Job text is inert untrusted data; no tools/actions/attachments, no contact/master CV sent. Failed AI keeps prior documents and permits deterministic generation without automatic paid retry.
- Free draft edits are retained and highlighted. Exact source-supported excerpts can be confirmed for export; newly entered factual text stays pending, excluded from verified document exports, until evidence is confirmed in the master profile and reanalysis/regeneration occurs. This deliberately favors truthful output over unrestricted factual paraphrasing; it never silently edits the master. Candidate-entered contact details are separately explicitly confirmed and reused consistently across formats; not AI inferred.
- Canonical structured content powers all previews/formats; cover letter uses job/employer title, selected evidence examples and bounded modest intent templates, not invented company claims. Provide two restrained templates (classic/compact), no multi-column layout. Every material claim has profile claim/evidence references and source-vs-draft comparison. Keyword report: verified included/omitted, transferable, unsupported candidate-declared gap, missing evidence; no ATS/hiring-probability claim.
- Generating a new immutable child revision preserves parents. Draft status is always review-required, never approved/submitted. Stale historical artifacts remain inspectable as stale but cannot be silently exported as current; require current evidence/review and regeneration. Capacity failures preserve history; no root/namespace deletion.

## Tasks and verification

- [x] Task1 model/evidence: failing tests for unchanged dates/categories, exact excerpts, selection/reword/diff, missing/unsupported/transfer keyword classification, contact confirmation, unverified edits and source/job hashes. Implement pure builders/strict validation; then focused tests pass.
- [x] Task2 AI/service/repository: failing controlled schema/injection/source/limit tests, bound consent, profile/job/review/assessment invalidation, owner/account changes during chat/read/write/download, uncertain/lost receipts, revision lineage/capacity. Implement explicit opt-in generation and immutable private snapshots; no automatic paid retry. Verify focused tests.
- [x] Task3 renderer: failing tests for actual DOCX ZIP/XML and PDF extraction, all dates/content/order, Unicode/selectability, long multi-page content, unsupported glyph failure, checksums. Deterministic local renderer with bounded pagination; inspect synthetic PDF and DOCX page images using packaged renderer, record unavailable platform tools honestly.
- [x] Task4 private preparation dashboard/editor: failing UI cases for selecting assessed shortlisted job, contact/review, editing/diff, cover option, preserving history on failure, stale sources and account switch, disabled export of pending unsupported claims. Wire private routes and safe return paths; no external employer actions.
- [x] Task5 full291 regression comparison + typecheck/build/SSR/HTTP; actual production Chrome previews/downloads/hash/PDF text/DOCX content, history, fallback, invalidation and ownership with synthetic SDK/model. Repeat M1–3 browser flows. Fresh code review, fix regression cases, report exact PASS/FAIL/BLOCKED/NOT TESTED and screenshots. Stop for review beforeM5.

## Review focus

Exact quoted text may be misleading when shortened (preserve negation and full dates/category); long/non-Latin strings may break PDF layout; source/assessment changes during consent/save/download must reject; contact/claim edits must not bypass evidence; immutable uncertain writes must not trigger paid regeneration or overwrite history. Full live isolation remains OPEN, including new preparation KV. Controlled synthetic tests do not certify service ownership or actual live-model behavior.

## Ledger

- Ruling: implementation details chosen within explicit Milestone4 authorization; reuse architecture and proceed inline without an additional design approval cycle. Cost of restrictive factual rewriting is reduced stylistic flexibility; disclose it in UI/report.
- Library references: https://docx.js.org/api/classes/index.Packer.html ; https://pdf-lib.js.org/docs/api/classes/pdfdocument ; https://pdf-lib.js.org/docs/api/classes/pdffont . Provider output formatting remains separately unverified live.

- 29 October rulings: arbitrary substring extraction is unsafe (negation loss); only complete source statements or redundant trailing original date removal are exportable. New factual edits remain pending until master evidence supports them. Paid freelance requires affirmative evidence and no negation. Developing skills have a separate heading; keyword report includes credentials/tasks/unresolved requests.
- 29 October download verification: each link rechecks current source/session/SHA-256 at click; ticket TTL is not treated as proof of freshness. Actual Chrome downloads validated across fresh tabs; repeated same-tab suppression is recorded as a browser limitation. No browser security preference was bypassed.
- Native DOCX PNG conversion attempted with packaged render_docx.py; BLOCKED because LibreOffice soffice.exe is absent. Actual DOCX ZIP/XML and python-docx content validation pass; generated PDF pages rasterized and visually inspected separately. Do not claim native DOCX visual QA passed.

- Final verification:343/343 tests;291 baseline preserved;9 SSR /17 HTTP /42 browser scenarios passed. Native DOCX visual QA remains explicitly BLOCKED. Fresh targeted review confirmed the download freshness repair. Stop beforeMilestone5.

- Visual QA found native PDF frames blank in automated Chrome. Replaced them with local PDF.js page canvases and page selection; actual ready-page assertions and inspected browser screenshots passed. Exported PDFs remain selectable text, not images.
