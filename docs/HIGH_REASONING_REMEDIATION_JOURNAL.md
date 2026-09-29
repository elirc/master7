# High Reasoning Remediation Journal

Date: 2026-05-05

This journal records the changes made after a deeper review of the LMS platform. The purpose is to turn review findings into codebase improvements and explain why each change matters for learning real-world engineering.

## Remediation Goals

- Protect tenant and learner data boundaries in derived views.
- Stop returning persistence-shaped records when a safe response DTO is required.
- Make learner activity records belong to enrollments, not just users and content IDs.
- Ensure lesson progress can only be recorded for lessons in the enrolled course version.
- Make published course versions preserve a content snapshot in the data model.
- Add a small production-style foundation for structured logging and consistent API errors.
- Expand tests around security-sensitive and lifecycle-sensitive behavior.

## Build Journal

### Dashboard Data Scoping

The dashboard service now builds a visible scope from the actor before returning enrollments, progress, quiz attempts, assignment submissions, certificates, and reports. The important change is that derived dashboard data now follows the same tenant and learner boundaries as primary resources.

Before this change, organization staff could receive all non-learner quiz attempts/submissions and all certificates. That was especially risky because dashboards often become the first place engineers add convenience data. The fix teaches that every projection needs the same backend authorization discipline as a direct list endpoint.

### Safe Transcript DTOs

The transcript service now returns a safe learner DTO instead of returning the raw in-memory user record. That prevents password-shaped fields from leaking into API responses and reinforces a production habit: persistence records and response objects are not the same thing.

### Enrollment-Owned Learning Records

Quiz attempts and assignment submissions now require `enrollmentId`. The services verify that the actor is the enrolled learner, that the enrollment exists, and that the quiz or assignment belongs to the enrolled course version's course.

Lesson progress now verifies that the submitted lesson ID belongs to the course version attached to the enrollment. This protects the invariant that progress is evidence for a specific version of a course, not arbitrary user activity.

### Published Version Snapshot Model

The in-memory `CourseVersion` now includes a `contentSnapshot`, and the Prisma `CourseVersion` model includes `contentSnapshot Json`. The schema also now links quiz attempts and assignment submissions to enrollments, and it adds explicit course relations for quizzes and assignments.

This is not yet the final versioning model, but it is a meaningful step: published versions now have a place to preserve the content shape learners took.

### Seed Data Consistency

The seeded issued certificate now has supporting durable records: completed enrollment, completed lessons, a passing quiz attempt, and a graded assignment submission. A second organization and certificate were added so tests can prove Acme admins do not receive Nova learner certificates.

### Production-Style Logging And API Errors

Added `apps/api/src/logger.ts` for structured JSON logs with levels. Request logs now go through this logger instead of direct `console.log`.

Added `apps/api/src/errors.ts` with application error mapping and Express error middleware. Routes now use a small `route(...)` wrapper so service errors flow through one response-shaping path. This avoids accidental 500s for known forbidden/not-found cases and gives tests a more reliable API contract.

Added `.env.example` and ignored `*.tsbuildinfo` so generated TypeScript build artifacts do not become part of the source trail later.

### Tests Added

Added tests for:

- Organization admin dashboard scoping.
- Transcript responses not exposing password fields.
- Rejecting lesson progress outside the enrolled course version.
- Rejecting quiz attempts for another learner's enrollment.
- Creating enrollment-scoped quiz attempts and assignment submissions.
- Policy coverage for learner work submission.

## Verification

Targeted checks passed during implementation:

- `npm run db:validate`
- `npm run typecheck`
- `npm test`

Final full verification:

- `npm run verify`

Status: passed.

The test run includes expected structured warning logs for negative-path API tests, such as forbidden lesson progress, cross-enrollment quiz attempts, and learner audit-log access. Those warnings are useful because the API is proving the guarded paths fail intentionally.

## Lessons Learned

The biggest lesson is that derived views are dangerous if they are treated as harmless. Dashboards, reports, transcripts, and verification views all need intentional data shaping.

Enrollment is the right owner for learning activity. User/course pairs look simpler, but they break down once course versions, retakes, cohorts, and recertification enter the system.

Response DTOs are a safety boundary. Returning raw records from services is convenient, but it can leak fields that were never meant to leave the backend.

Seed data is part of the teaching surface. If seed records violate domain rules, future developers learn the wrong model.

Centralized error handling is not just polish. It makes tests clearer, makes API behavior more predictable, and makes production logs easier to reason about.
