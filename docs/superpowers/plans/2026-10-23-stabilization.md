# JobPilot stabilization implementation plan

**Goal:** Repair the existing analyzer before any major V1 feature implementation.
**Architecture:** Preserve React Router, Zustand and Puter. Work in the dedicated audit clone on a stabilization branch; no auth or storage migration.
**Spec:** User-approved stabilization scope and `outputs/phase-0-audit.md` in the parent task workspace.
**Execution:** Inline, explicitly authorized by the user's instruction to start stabilization; stop for review before V1 features.

## Constraints and review focus

Never publish personal documents, add secrets, submit applications, or fabricate qualifications. Existing valid legacy records must remain readable. Client guards are defense in depth; Puter service isolation must be tested with two real accounts before production acceptance. No destructive migration or broad root deletion.

## Tasks

1. [x] Establish Vitest + jsdom/component tests, reproduce the six compiler errors, fix void effect cleanup and put Vite middleware in a plugin hook. Verify tests, typecheck and build.
2. [x] Add runtime feedback/record validators with tests for valid legacy records, malformed JSON, refusals, missing fields, empty content, invalid scores/tips and corrupt list entries. Extract upload transaction with injected SDK/converter and explicit session checks. Test all failure stages, save failure, no provisional record, cleanup and retry; wire recoverable form state without logging personal data.
3. [x] Test auth readiness and owner-change races in routes/store. Block SDK reads/writes before authenticated readiness; drop late results; clear displayed private state when session changes. Validate local redirect destinations. Test sign-out during pending auth and SDK calls. Revoke blob URLs.
4. [x] Replace broad wipe with a validated resume-record deletion service. Delete only dedicated app-owned file paths, await every deletion, retain failed records for retry, never flush KV/root. Legacy files without ownership provenance remain intact with explicit UI notice. Test unrelated keys/files, corrupt records, partial failure and session changes.
5. [x] Run full automated checks and review diff; record actual results and limits. Write implementation design covering milestones, storage, security boundaries, AI evidence restrictions, approvals, tracking, acceptance and required tests. Package review artifacts under outputs. Stop before V1 implementation.

## Verification

`npm test`, `npm run typecheck`, `npm run build`, `git diff --check`. Regression tests mock the SDK boundary, never use real CVs. Unit/component results do not certify live Puter access control. No live deletion or paid model calls are needed for stabilization.


## Execution ledger

- Reproduced original six compiler diagnostics. Initial sandbox typegen failed EPERM; generated-file verification succeeded with escalation.
- Auth regression tests first failed on early access, stale read results and late auth resurrection; route tests failed on early reads, stuck upload and removal state. Implemented guards, epochs, private boundary, validated transaction and scoped deletion.
- Added failed-promise/never-settled operation tests and explicit request bounds. Timeouts do not cancel remote operations.
- Review identified cached SDK account identity and blind retry after an ambiguous save. Added identity preflight/lifecycle refresh, stable attempt IDs, private recovery journals and reconciliation tests. Reviewer re-review found no further important defects in those changes.
- Ruling: legacy file provenance cannot be proven, so preserve readable legacy records but retain their files on delete. No broad root cleanup.
- Ruling: preserve files on ambiguous save; never delete artifacts that may already have a saved record. Keep journals for manual recovery rather than claim transactional KV.
- V1 implementation remains stopped for design review. Live two-account, model and PDF integration gates remain open.
