# Observability Walkthrough

File: `apps/api/src/observability.ts`

This file owns the first operational hooks: request IDs, structured request logs, and health snapshot data.

`requestLogger` attaches or preserves an `x-request-id`, measures duration, writes a JSON log entry, and returns the ID to the caller. This is useful when debugging a user report because the frontend, API logs, and future worker jobs can share one correlation value.

`healthSnapshot` reports process readiness and dependency configuration. It intentionally says database and Redis are not connected in feature 02. A senior engineer avoids health checks that look green while skipping real dependency checks.

Change carefully: never log bearer tokens, passwords, full request bodies, or sensitive assignment content.
