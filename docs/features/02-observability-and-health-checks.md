# 02 - Observability And Health Checks

## Goal

Add a small but realistic operational foundation: structured request logs, request IDs, and a health endpoint that reports process and dependency readiness. This teaches that enterprise systems are not done when features work locally; they must also be diagnosable.

## Impacted Codebase Areas

- `apps/api`
- `packages/config`
- `docs/ARCHITECTURE_JOURNAL.md`
- `docs/CODEBASE_STRUCTURE_AND_SYSTEM_DESIGN.md`
- `docs/code-walkthroughs`

## Implementation Approach

Add API middleware that attaches a request ID, records method/path/status/duration, and returns the request ID in response headers. Expand `/health` to include service name, uptime, timestamp, database configuration presence, and Redis configuration presence. Keep this slice lightweight and dependency-free.

## Design Considerations

Request logs should not include secrets, passwords, bearer tokens, or full request bodies. Health checks should be useful for local development without falsely claiming that dependencies are live when this slice does not yet open database or Redis connections.

## Build Journal

Implemented `apps/api/src/observability.ts` with request ID handling, structured JSON request logs, and a health snapshot helper. The API now preserves incoming `x-request-id` values, returns them in response headers, measures request duration, and logs method, path, status code, request ID, and duration.

The `/health` endpoint now returns service identity, timestamp, uptime, and dependency configuration status. It intentionally reports database and Redis as not connected in this slice because the API has not opened live dependency connections yet. That honesty matters: a health check should not claim operational readiness it has not actually tested.

Updated API tests to verify the health response and request ID propagation. Added a code walkthrough for observability and updated the reading order.

## Verification

Commands run:

- `npm run verify`

Final status: `npm run verify` passes, including Prisma validation, TypeScript build mode, Vitest tests, and production builds.

## Lessons Learned

Operational behavior is part of product engineering. Request IDs make user reports debuggable because one identifier can connect frontend errors, API logs, and future worker logs.

Health checks should distinguish configuration from connectivity. In feature 02 the database URL exists, but the API does not yet prove database reachability. Naming that limitation keeps operators from trusting a misleading green check.

Do not log secrets, bearer tokens, passwords, assignment bodies, or sensitive learner data. Observability should improve diagnosis without creating a privacy or security problem.
