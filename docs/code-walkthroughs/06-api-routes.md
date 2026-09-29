# API Routes Walkthrough

File: `apps/api/src/index.ts`

This file creates the Express app, parses JSON, validates request bodies, authenticates requests, and delegates to services.

Routes should stay thin. If a route starts making business decisions, move that logic to `services.ts` or a future module service. Thin routes make authorization and workflow tests easier to reason about.

The route layer imports schemas from `packages/contracts`. That keeps request validation explicit and creates a path toward generated API clients later.
