> **Current checkpoint — 30 October 2026:** Controlled synthetic local development only. All five core milestones are implemented; earlier milestone sections below are historical. Live in-flight Puter isolation remains unverified, and the memory-only verification harness lost-state issue remains unresolved. Real-data use, private deployment and public multi-user release remain **BLOCKED**. See [release blockers](docs/release-blockers.md) and [checkpoint review](docs/github-checkpoint-2026-10-30.md). No automatic applications or employer submissions.

# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.


## JobPilot stabilization review

This branch stabilizes the existing analyzer only. Major JobPilot V1 features are awaiting design review. React Router and Puter remain in place.

Run `npm ci --ignore-scripts`, `npm test`, `npm run typecheck`, and `npm run build`, then `node scripts/ssr-smoke.mjs`. Tests use synthetic data and mocked Puter boundaries; they make no paid model calls. CI runs the same checks on Node 24. Local verification used Windows and Node 24; Docker's existing Node 20 configuration is unchanged and has not been validated in this environment.

Private routes wait for authentication. SDK calls verify the active account, and focus/visibility changes revalidate it. New uploads use `jobpilot/resumes/<id>` folders, validate AI feedback before saving, and keep a private recovery journal under `resume-pending:<id>`. Repeating the same form attempt first checks for a saved result. An uncertain save blocks rerunning AI for that attempt. Orphan folders are shown on the home screen for manual recovery; remote writes cannot be canceled merely by timing out locally.

The deletion screen deletes only validated records with dedicated app-owned file paths, after deliberate selection. It preserves legacy/invalid records and never flushes KV or deletes the app root. Existing valid legacy analyzer records remain readable. Some prior interrupted analyses may be invalid and are reported rather than rendered or deleted.

Before a production release, verify real Puter two-account isolation, out-of-band/in-flight account changes, deployment origin/app identity, live AI and PDF-worker behavior, dependency vulnerabilities, and deployment privacy settings. Unused sample CV images with unverified provenance have been removed from the public build. Client tests do not certify those service guarantees. No applications are submitted by this branch.

Design: `docs/superpowers/specs/2026-10-23-jobpilot-design.md`.


## Focused verification gate

See `docs/verification-gate.md`. Local verification has 74 passing tests, including all 53 original cases, plus browser PDF and production HTTP checks. Real Puter two-account isolation remains pending successful disposable-account authentication; mocks are not service-isolation evidence.

`node scripts/http-smoke.mjs` checks the production server over real loopback TCP after a build. A restricted sandbox may reject loopback with EACCES even for its plain HTTP control. `node verification/serve-pdf-harness.mjs` serves standalone synthetic PDF and disposable-account harnesses at port 5174; these pages are not application routes or public production assets. Never use production personal documents/accounts in those harnesses. The account page must remain open until its captured synthetic fixtures are cleaned up.

## Candidate profile (controlled local Milestone 1)

Run `npm run dev -- --host 127.0.0.1` and open `/profile` on the printed local URL. Import a readable synthetic PDF, inspect extracted pages, edit and confirm claims, set preferences, and explicitly consent before saving a private immutable Puter revision. The original PDF stays local; extracted evidence is saved privately. CV-backed candidate confirmation is not independent verification. Unknown claims stay unconfirmed, and facts outside the CV remain candidate attestations.

See `docs/milestone-1-completion.md` for actual tests, commands and limitations. Full live account isolation remains an OPEN release blocker; no public deployment or automatic applications are authorized. Job discovery (Milestone 2) has not started.

## Job discovery (controlled local Milestone 2)

Open `/jobs` on the main app URL printed by `npm run dev -- --host 127.0.0.1` (the separate account-verification server on port 5174 is not the main app). The reviewed catalog currently contains Greenhouse, Lever and Ashby's own public boards. Discoveries use server-side public GET adapters, local preference filters and private Puter review events. Arbitrary manual URLs are not fetched; pasted jobs and missing evidence remain unverified. No qualification scores or automatic applications are implemented.

See `docs/milestone-2-completion.md` for 228 passing tests, all original 144 preserved, actual live-provider checks, browser evidence and limits. Full live isolation remains an OPEN release blocker. Milestone 3 requires review authorization; no push or deployment is authorized.

## Qualification matching (controlled local Milestone 3)

Milestone 3 is implemented for local review. From `/jobs`, select **Assess qualifications**, inspect source evidence, analyze deterministically or explicitly consent to bounded Puter AI excerpts/cost, then manually shortlist/dismiss. Editable100-point evidence rubric, eligibility gates, confidence, required/preferred gaps and separate salary/hours constraints are available. Dashboard scores hide when profile/job/preferences/date bindings change. No tailoring, submissions or automatic applications are enabled.

See `docs/milestone-3-completion.md` and outputs for actual verification and limits. Full live account isolation remains an OPEN release blocker; synthetic browser/model tests do not certify it. No push or public deployment. Stop for review before Milestone4. Earlier milestone sections describe their historical state.

## Document preparation (controlled local Milestone 4)

Open `/prepare` in the main app after assessing and shortlisting a job. Generate a source-backed CV and optional cover letter, review differences, edit supported statements and download local selectable PDF/editable DOCX files. Confirm contact details, save/review a revision, render previews and validate each file before clicking its download link. New factual wording remains pending until supported by the master evidence. No application approvals or submissions exist.

See `docs/milestone-4-completion.md`:343 tests, all291 baseline cases preserved, TypeScript/build,9 SSR routes,17 HTTP checks and42 browser scenarios. Native DOCX visual rendering remains BLOCKED (LibreOffice absent); XML/content and real download checks passed. Same-tab repeated downloads were suppressed by automated Chrome; cover files were verified in fresh tabs without changing browser security settings. Full live isolation and dependency advisory remediation remain public-release blockers. No live paid model, push, deployment or Milestone5 implementation.

## Application management (controlled local Milestone 5)

Open `/applications` or continue from a saved preparation revision. Review exact source snapshots and document hashes, confirm screening answers and explicitly approve the package. Edits require a new revision and approval. Only then use the official manual handoff, approved downloads and answer copy controls. Confirm submission yourself; opening a page never records it. Track interview/offer progress, responses and follow-up notes privately. Intentional reapplications require explicit confirmation and a reason.

See `docs/milestone-5-completion.md` for377 passing tests (all343 baseline retained),10 SSR,18 HTTP and55 browser scenarios. Four approved downloads matched immutable hashes. Full live isolation remains OPEN; native DOCX appearance is BLOCKED and30 dependency advisories remain unresolved. Earlier sections describe historical milestone state. No automated employer submission, push or public deployment. Stopped for review.

## Release acceptance (Milestone 6, 30 October 2026)

The local acceptance suite passes395 tests (all377 baseline retained),10 SSR,23 HTTP,55 prior browser scenarios and a16-check continuous synthetic-CV/live-public-description journey. The official page was opened using GET only, with no employer form submission. Compatible Router/Vite/Vitest security updates leave3 development audit entries and0 production entries.

**Real personal-data local use, private deployment and public multi-user release remain BLOCKED.** Static live synthetic isolation passed both directions, but actual request races, native DOCX layout, deployment-origin privacy and verified SA job coverage remain open. See docs/milestone-6-completion.md, docs/milestone-6-dependency-audit.md and docs/milestone-6-native-acceptance.md. Original synthetic fixtures were recovered and cleaned with exact ownership/content checks. Stopped for review; no push, deployment or automatic/real application.
