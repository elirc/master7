# 01 - Initial Enterprise LMS Vertical Slice

## Goal

Create a coherent first version of an enterprise learning management and certification platform. The slice should include authentication, roles, organizations, course authoring, publication, enrollments, learner progress, quizzes, assignments, certificates, reporting, audit logs, seed data, and a useful frontend.

## Impacted Codebase Areas

- Root workspace configuration
- `apps/api`
- `apps/web`
- `apps/worker`
- `packages/database`
- `packages/domain`
- `packages/config`
- `packages/contracts`
- `packages/test-utils`
- `docs`

## Implementation Approach

Build a TypeScript npm-workspace monorepo. Use an Express API with service modules and an in-memory repository for the first teaching slice, while defining a Prisma schema that captures the intended production data model. Use React for a realistic dashboard surface. Add domain tests around workflow rules and API smoke tests around important role boundaries.

## Design Considerations

Course drafts, published versions, enrollments, and lesson progress must be separate. Quiz definitions, attempts, answers, and grading outcomes must be separate. Assignment definitions, submissions, grading, and feedback must be separate. Certificates should be generated artifacts with verification metadata. Reports should come from durable records.

## Build Journal

Implemented a TypeScript npm-workspace monorepo with `apps/api`, `apps/web`, `apps/worker`, and shared packages for domain rules, contracts, config, database modeling, and test utilities.

The first API slice includes seeded authentication, actor context, role-aware dashboard data, course creation, course publication, enrollment, lesson progress, quiz attempts, assignment submission and grading, certificate request records, basic reports, and audit logs. The backend owns authorization decisions; the React UI only shapes the user experience by role.

The Prisma schema models the durable production target even though feature 01 uses an in-memory API store. This is an intentional learning tradeoff: the repository can teach correct domain boundaries before persistence is fully wired. The important LMS-specific separations are present: course drafts differ from published versions, enrollments point to versions, progress belongs to enrollments, quiz attempts are separate from quiz definitions, assignment submissions are separate from assignment definitions, and certificates are generated artifact records with verification metadata.

The frontend provides a coherent enterprise dashboard with seeded role login, catalog panels, reporting metrics, learner workflow actions, instructor/admin workflow actions, certificates, and audit-log visibility. The worker app establishes a future boundary for certificate generation, notifications, and exports.

A junior developer should notice how the same workflow appears in multiple layers: contract validation at the edge, service authority in the API, shared business rules in `packages/domain`, and role-shaped UX in the frontend. The senior habit is deciding which layer owns which responsibility.

Future hardening should replace the in-memory store with Prisma repositories, hash passwords, add integration tests against Postgres, split frontend components, add stronger policy objects, persist background jobs, and introduce OpenAPI or generated clients.

## Verification

Initial verification passed after fixing NodeNext import specifiers, package source exports for Vitest, a local Prisma `DATABASE_URL`, and overly narrow seed-data inference.

Commands run:

- `npm install`
- `npm run db:validate`
- `npm run typecheck`
- `npm test`
- `npm run verify`

Final status: `npm run verify` passes.

## Lessons Learned

Good domain modeling starts before infrastructure is complete. Keeping draft content, published versions, enrollments, progress, attempts, submissions, and certificates separate makes the system easier to reason about later.

TypeScript caught a realistic bug: literal seed data inferred the store too narrowly, so legal workflow transitions looked impossible. Explicit repository-shaped types are useful even for demo stores.

The frontend can make the product understandable, but backend services must still enforce authorization because users can call APIs directly.
