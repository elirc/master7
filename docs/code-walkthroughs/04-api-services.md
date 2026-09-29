# API Services Walkthrough

File: `apps/api/src/services.ts`

This file owns business workflows. Controllers call services; services call domain helpers and mutate durable records.

Important workflows:

- `createCourse` checks author permissions and writes an audit log.
- `publishCourse` transitions a draft and creates a published version.
- `enroll` creates an enrollment to a version.
- `completeLesson` writes progress against an enrollment.
- `submitQuiz` creates a graded quiz attempt.
- `submitAssignment` creates a submission record.
- `issueCertificate` reads durable completion records and creates verification metadata.

This file protects a key backend rule: frontend UX is not security. Every sensitive workflow checks the actor again.
