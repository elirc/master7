# Codebase Structure And System Design

## Repository Structure

- `apps/api`: Express API with thin route handlers and service-owned workflows.
- `apps/web`: React/Vite enterprise dashboard experience.
- `apps/worker`: background job boundary for retryable side effects.
- `packages/database`: Prisma schema and future seed/migration ownership.
- `packages/domain`: shared role, state, and workflow helpers.
- `packages/contracts`: Zod request schemas shared by API and future clients.
- `packages/config`: environment parsing.
- `packages/test-utils`: reusable test actors and fixtures.
- `docs`: architecture plans, feature journals, and walkthroughs.

## Runtime Processes

The local product has three processes: API on port `4000`, web on port `5173`, and optional worker execution. Docker Compose provides PostgreSQL and Redis. Feature 01 uses an in-memory API store so the workflow can be inspected immediately; the Prisma schema records the production-shaped target.

## Shared Packages

`packages/domain` protects business rules that should not be duplicated across API services. `packages/contracts` validates API inputs. `packages/config` gives every process the same environment defaults.

## API Modules

`apps/api/src/index.ts` defines HTTP routes. `apps/api/src/auth.ts` validates bearer tokens and attaches an actor context. `apps/api/src/policies.ts` names authorization decisions. `apps/api/src/errors.ts` centralizes API error mapping. `apps/api/src/logger.ts` emits structured logs. `apps/api/src/observability.ts` adds request IDs, structured request logs, and health snapshots. `apps/api/src/services.ts` owns business workflows. `apps/api/src/store.ts` contains feature-01 seed data and durable record shapes.

## Frontend Structure

The web app is intentionally compact in feature 01. `apps/web/src/main.tsx` contains role selection, dashboard state, role-shaped actions, and reporting panels. `apps/web/src/styles.css` defines a restrained enterprise interface.

## Worker Structure

The worker currently demonstrates job names and handler shape. Future features should replace the demo array with BullMQ and Redis-backed retry policies.

## Main Data Models

The Prisma schema separates organizations, users, course drafts, course modules, lessons, published course versions, enrollments, lesson progress, quiz definitions, quiz attempts, assignment definitions, submissions, certificates, and audit logs.

## Key Workflows

- Instructor or admin creates a draft course.
- Instructor publishes a course version.
- Learner enrolls in a published version.
- Learner progress belongs to the enrollment.
- Quiz attempts and assignment submissions belong to enrollments and become durable learning records.
- Certificate issuance reads durable completion records and creates verification metadata.
- Reporting reads enrollments, progress, attempts, submissions, and certificates.
- Catalog search applies backend visibility before caller filters.
- Learner transcripts are derived from durable learning records.
- Certificate verification exposes a narrow public validation payload.
- Audit log browsing is role-scoped.
- Published course versions carry a content snapshot placeholder so learner history can refer to the content shape taken.

## System Design Decisions

Feature 01 keeps persistence in memory to make the first vertical slice fast to inspect. The database schema is still real because modeling pressure should be visible from the start. This teaches an important engineering distinction: the domain model can be production-shaped before every infrastructure concern is fully wired.

## Tradeoffs Made

- Express is used instead of NestJS for readability in the first slice.
- Passwords are plain seeded demo values and must be replaced with hashing before real use.
- The API store is in memory and will reset on restart.
- The worker is a boundary demonstration, not a persistent queue yet.
- Browser tests are deferred until the UI and API persistence are less volatile.

## Current Known Gaps

- No real database repositories or migrations yet.
- No refresh tokens or invitation flow.
- Authorization rules now have a policy module, but they are not yet organized by domain resource.
- Assignment grading now has organization-scoped policy checks, but grading workflow states are still basic.
- Certificate generation is synchronous through the API.
- No OpenAPI or generated client yet.
- Health checks report dependency configuration but do not yet verify live database or Redis connectivity.
- Audit log filtering lacks date ranges, actor filters, retention policy, and export controls.
- Published course version snapshots are still coarse JSON placeholders, not normalized versioned content tables.

## Suggested Reading Path

1. `docs/ARCHITECTURE_JOURNAL.md`
2. `docs/features/01-initial-enterprise-lms-vertical-slice.md`
3. `packages/domain/src/index.ts`
4. `packages/database/prisma/schema.prisma`
5. `apps/api/src/store.ts`
6. `apps/api/src/services.ts`
7. `apps/api/src/index.ts`
8. `apps/api/src/policies.ts`
9. `apps/api/src/observability.ts`
10. `apps/web/src/main.tsx`
11. `apps/worker/src/index.ts`
