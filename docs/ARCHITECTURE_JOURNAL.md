# Architecture Journal

## 2026-05-05 - Project Framing

We are building an enterprise-style learning management and certification platform as a teaching codebase. The goal is not only a working app; the goal is a repository that visibly grows through planned, implemented, verified feature slices.

The platform is shaped as a modular monolith. That means one deployable backend owns the business truth, but the code is divided into modules with clear boundaries. This gives junior developers the experience of a real enterprise codebase without the distributed-systems overhead of microservices.

Initial runtime shape:

- `apps/web`: React frontend for learner, instructor, organization admin, and platform admin workflows.
- `apps/api`: HTTP API and business workflow services.
- `apps/worker`: background job runner for retryable side effects such as certificate generation.
- `packages/database`: Prisma schema and seed data.
- `packages/domain`: shared business rules and state helpers.
- `packages/config`: environment parsing.
- `packages/contracts`: typed request/response schemas.
- `packages/test-utils`: reusable test fixtures.
- `docs`: architecture journals, feature plans, code walkthroughs, and system maps.

## Architecture Decisions

### Modular Monolith First

A modular monolith keeps the first learning step focused on domain modeling, authorization, workflow design, and testable services. The important senior-engineering habit is to keep module boundaries real even when deployment is simple.

### Express Instead Of NestJS For The First Slice

NestJS would be a good long-term fit for controllers, providers, guards, and modules. For this learning slice, Express keeps the code easier to read end-to-end in one session. The backend still follows Nest-like boundaries: thin routes, services for workflow authority, contracts for validation, and shared domain helpers.

### Backend Owns Authority

The frontend can hide buttons and shape UX by role, but every sensitive action must be checked in the API. This distinction matters because users can bypass frontend checks with direct HTTP calls.

### Source Records Before Derived Effects

Progress, quiz attempts, assignment submissions, audit logs, and certificates are durable records. Reports and dashboards should read from those records rather than inventing state in the browser.

### Versioning From The Start

Course drafts, published versions, enrollments, and progress are separate concepts. A learner enrolls in a published course version, not a mutable authoring draft. This protects historical learning records when instructors edit future course content.

## Testing Strategy

The first slice emphasizes domain and service-level tests over brittle UI tests. Playwright is included for browser workflow tests once the UI stabilizes. Prisma validation, TypeScript build mode, unit tests, and production builds form the baseline verification loop.

## Operational Concerns

PostgreSQL is the source of truth. Redis is present for future job queues. The first worker uses an in-process mock queue boundary so the code teaches where background work belongs without requiring production queue operations immediately.

## Next Pressure Points

- Replace in-memory API demo store with Prisma-backed repositories.
- Add real migrations and integration tests against Postgres.
- Add explicit policy objects for authorization.
- Add domain events and an outbox before async workflows multiply.
- Add observability, health checks, and operational dashboards.

## 2026-05-05 - Feature 01 Built And Verified

The first vertical slice is now implemented and verified. The repo contains a working API, web app, worker boundary, Prisma schema, domain helpers, contracts, tests, code walkthroughs, and system map.

The most important teaching choice was to build the domain shape first. Even though persistence is temporarily in memory, the code already separates authoring drafts, published versions, enrollments, progress, quiz attempts, assignment submissions, certificates, reports, and audit logs. This lets future persistence work migrate a realistic model instead of inventing the model later.

Verification exposed two useful lessons. First, NodeNext module resolution requires explicit import specifiers in local TypeScript files. Second, literal seed objects can be inferred too narrowly unless the store has an explicit type. Both are normal real-world TypeScript issues.

## 2026-05-05 - Feature 02 Built And Verified

Added request IDs, structured request logs, and a richer health endpoint. This is the start of operational design. The health endpoint is intentionally honest: database and Redis are configured but not live-checked yet.

The next operational pressure point is to connect the health endpoint to real repositories and queues once feature work moves from demo store to PostgreSQL and Redis.

## 2026-05-05 - Feature 03 Built And Verified

Authorization now has a named policy layer. This is a maintainability improvement more than a product feature. It makes access rules easier to find, test, and discuss.

The service layer still owns workflow sequencing and data lookup. The policy layer owns the decision about whether the actor may operate on the resource context. That separation is important because enterprise systems often fail when authorization rules are scattered as one-off conditionals.

## 2026-05-05 - Feature 04 Built And Verified

Added backend-owned catalog search, filtering, and pagination. The important design point is ordering: actor visibility is applied before caller filters. This prevents a user from treating query parameters as an escape hatch around tenant boundaries.

## 2026-05-05 - Feature 05 Built And Verified

Added learner transcripts as a derived API view over durable learning records. This is a good example of source records versus projections: enrollments, progress, attempts, submissions, and certificates remain the source of truth; the transcript is a readable assembly of those facts.

## 2026-05-05 - Feature 06 Built And Verified

Added public certificate verification. This reinforces the idea that certificates are generated artifacts with verification metadata, not booleans on enrollments.

## 2026-05-05 - Feature 07 Built And Verified

Added an audit log viewer endpoint with scoped access. Learners are blocked, organization-scoped staff see only their organization logs, and platform admins can inspect across tenants. This is a small feature, but it represents a larger enterprise concern: accountability records need product surfaces and access rules.

## 2026-05-05 - High-Reasoning Remediation

A deeper review found that the project direction was good, but several shortcuts had become unsafe foundations for more feature work. The remediation pass hardened dashboard scoping, transcript DTOs, enrollment-owned quiz/assignment records, lesson-version validation, published version snapshots, structured logging, and API error handling.

The key senior-engineering lesson is that the next best feature is sometimes not a product feature. Sometimes it is a correctness slice that prevents the codebase from teaching or compounding the wrong abstraction.
