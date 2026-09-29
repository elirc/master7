# Prisma Schema Walkthrough

File: `packages/database/prisma/schema.prisma`

This file is the durable data model target. Feature 01 does not yet persist through Prisma, but the schema teaches the shape the system is growing toward.

The most important modeling idea is separation of source records:

- `Course` is the authoring draft.
- `CourseVersion` is the published version a learner can take.
- `Enrollment` points to a `CourseVersion`.
- `LessonProgress` points to an `Enrollment`.
- `Quiz`, `QuizQuestion`, and `QuizAttempt` are separate.
- `Assignment` and `AssignmentSubmission` are separate.
- `Certificate` stores generated artifact metadata.
- `AuditLog` stores compliance-sensitive actions.

Senior-level caution: do not collapse these models for convenience. Collapsing them makes reporting and historical accuracy fragile.
