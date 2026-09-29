# Worker Boundary Walkthrough

File: `apps/worker/src/index.ts`

This file demonstrates where retryable side effects belong. Certificate generation, notification delivery, and report exports should eventually run outside request/response handlers.

Feature 01 uses a demo job array to keep the boundary visible. A production version should use Redis and BullMQ, idempotency keys, retry policies, dead-letter handling, and operational dashboards.
