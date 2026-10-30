# JobPilot AI release-blocker register

Reviewed 30 October 2026 during Milestone 6. Controlled local synthetic development only. Passing mocks or browser tests does not close live-service/deployment security. Historical milestone results remain in their completion reports.

| ID | Status | Evidence / remaining limit | Required closure |
|---|---|---|---|
| SEC-01 | PARTIALLY VERIFIED / OPEN | User-assisted live A-to-B and B-to-A raw key/PDF denials and owner survival passed for five actual private namespaces. Full isolation is not certified. | Complete untested live operation directions and verify the exact deployment origin. See milestone-6-completion.md and user-assisted-live-evidence.json. |
| SEC-02 | OPEN | Stale generation/approval/download-preparation rejection passed, but read/upload races were BLOCKED and all wire-in-flight checks are NOT TESTED. Historical approval-write RPC overlap was downgraded to UNVERIFIED after dispatch review. | Measure actual target dispatch/request lifecycle, late writes and reverse-direction races. Pending promises alone do not prove wire overlap. |
| SEC-03 | OPEN | Production Puter app identity/origin, hosting privacy, HTTPS and security headers have not been certified. No deployment attempted. | Review exact hosting origin, app identity and permissions; test privacy there before real personal data use. |
| SEC-04 | OPEN: development graph | Final npm audit3 entries:2 critical,1 moderate (@vitest/mocker, tinypool, vitest). Production audit0. Compatible Router7.18.5/Vite6.4.5/Vitest3.2.7 updates and full regression pass. All30 original entries have a ledger. | Review a Vitest major migration. Do not expose dev/test endpoints or dismiss residual findings. Production audit0 is not a security certificate. |
| DOC-01 | BLOCKED by environment | No native-compatible viewer or connected Word session. Short1-page/long5-page/cover1-page PDF and DOCX text/structure pass separately. | Complete milestone-6-native-acceptance.md in Word/LibreOffice/compatible viewer; inspect every page. PDF/XML cannot prove DOCX layout. |
| AI-01 | NOT TESTED | No live paid-model semantic accuracy, schema or retention certification. Controlled responses/test mode are separate evidence. | Controlled consented synthetic live-provider tests and processing review, retaining strict source/schema validation. |
| UX-01 | Environment limit / NOT TESTED | Actual approved file bytes verified across fresh tabs. Chrome can suppress repeated same-tab downloads. Physical native-transfer cancellation or account switch after transfer start not tested. | Representative browser permissions and bounded download/interruption checks without weakening browser security. |
| COVER-01 | FAIL in observed sample | Three employer boards returned89 listings but0 fully verified recent SA-eligible roles. UNKNOWN retained. | Review permitted employer coverage and eligibility evidence before claiming useful verified international SA discovery. No catalog expansion was silently added. |

## Dependency exposure review

The per-package ledger assesses every original entry: affected ranges, exact versions, direct/transitive and production/development paths, exploitability, remediation and residual risk. Router/Express runtime concerns were patched within existing majors; current mocker/Tinypool/Vitest findings remain development risks. The application does not introduce file-session storage, archive upload extraction, an employer submission endpoint or publicly listening Vitest UI. Those facts narrow exposure; they do not dismiss an advisory or certify safe hosting. Exact direct/transitive changes and before/after audit evidence remain in task outputs.

## Privacy and document limits

Approval hashes, source/session guards, explicit confirmations and tests establish observed application behavior, not universal underlying service isolation or factual truth of candidate self-reports. Official destination validation protects the initial reviewed ATS URL and strips opener/referrer/private query data. The normal browser may follow later employer-controlled redirects, which the app cannot inspect or certify; no candidate documents or answers are attached. No native DOCX visual PASS is inferred from XML or separately rendered PDF.


## 30 October 2026 checkpoint — blockers preserved

Milestone6A source is checkpointed for continued synthetic local development only. Latest automated baseline has418 tests (including all410 previously accepted assertions). The eight-board live scan returned230 unique records, four recent original postings and zero recent-original/confirmed-SA combinations. Recent last-publication dates are reported separately; UNKNOWN remains UNKNOWN.

**SEC-02 remains OPEN:** target-request instrumentation and loopback calibration are not live Puter isolation proof. Fresh run `d2db6082-4612-4ee7-9e91-b58124d02493` reported B-to-A read denials, but the original harness state was subsequently lost. Its owner-survival continuation was BLOCKED and no in-flight test was performed. User-reported exact recovery cleanup confirmed six captured keys and the original PDF absent under each account; no broad deletion. These cleanup results do not close isolation.

**SEC-05 — OPEN: verification harness lost state.** Run IDs and captured fixture references live only in page memory. Reload/navigation/dev-server reload can lose the original run. The latest run required read-only recovery and exact cleanup. Do not restart live fixtures until this workflow issue is addressed in separately authorized work. No fix is claimed in this checkpoint.

Native DOCX appearance, live paid-model behavior, exact deployment-origin privacy, physical download interruption, useful verified SA coverage and development-only dependency advisories remain outstanding. Real-data local use, private deployment and public multi-user deployment remain **BLOCKED**. Pushing a development branch is not release acceptance, permission to merge, or deployment authorization.
