# Enterprise LMS / Certification Platform

This repository is a teaching codebase for growing a realistic enterprise learning management and certification platform through documented feature slices.

## Quick Start

```bash
npm install
npm run verify
npm run dev
```

The API defaults to `http://localhost:4000`. The web app defaults to `http://localhost:5173`.

If port `4000` is already in use, run the API with another port and point Vite at it:

```bash
$env:API_PORT="4001"; npm run dev --workspace @lms/api
$env:VITE_API_TARGET="http://localhost:4001"; npm run dev --workspace @lms/web
```

Seeded demo users all use password `password123`:

- `learner@acme.test`
- `instructor@acme.test`
- `admin@acme.test`
- `platform@lms.test`

## Documentation Path

Start here:

1. `docs/ARCHITECTURE_JOURNAL.md`
2. `docs/SYSTEM_DESIGN_FORWARD_PLAN.md`
3. `docs/features/01-initial-enterprise-lms-vertical-slice.md`
4. `docs/features/02-observability-and-health-checks.md`
5. `docs/features/03-authorization-policy-layer.md`
6. `docs/features/04-course-search-filtering-pagination.md`
7. `docs/features/05-learner-transcript.md`
8. `docs/features/06-certificate-verification-page.md`
9. `docs/features/07-audit-log-viewer.md`
10. `docs/CODEBASE_STRUCTURE_AND_SYSTEM_DESIGN.md`
11. `docs/code-walkthroughs/README.md`
12. `docs/HIGH_REASONING_REMEDIATION_JOURNAL.md`
13. `astraupskill/README.md` — tenant-scoped dashboard audit-log repair course (the CRUD upskilling course in this repository)

## Current Verification

`npm run verify` passes. It runs Prisma schema validation, TypeScript build mode, Vitest tests, and production builds.

The current feature trail is complete through feature `07`. The next recommended slice is `08 - Assignment Rubrics`, followed by richer grading workflows.

After the high-reasoning remediation pass, the next recommended product slice is still assignment rubrics, but the next recommended platform slice is Prisma-backed repositories with real migration discipline.

## CRUD upskilling course

Follow the [dashboard audit-scope course](astraupskill/README.md) for the actual code path, worked repair, HTTP regression, practice and solutions.
