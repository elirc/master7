# 05 - Learner Transcript

## Goal

Create a learner transcript endpoint and UI surface that summarizes a learner's enrollments, progress, quiz outcomes, assignment outcomes, and certificate status.

## Impacted Codebase Areas

- `apps/api`
- `apps/web`
- Tests
- Architecture docs

## Implementation Approach

Add a service method that builds transcript records from durable learning records. Expose `/learners/:learnerId/transcript` with backend authorization. Add dashboard rendering for the current learner's transcript.

## Design Considerations

The transcript should not calculate from frontend state. It should read durable records and preserve historical course version information. Learners can read their own transcript; platform admins can read all transcripts in this first version.

## Build Journal

Implemented `services.transcript` and `/learners/:learnerId/transcript`. The transcript is assembled from enrollments, course versions, lesson progress, quiz attempts, assignment submissions, and certificates.

The frontend now displays a transcript panel with the course title, version, enrollment status, lesson completion count, quiz attempt count, and assignment submission count. This gives learners a consolidated record without letting the browser invent official completion state.

The transcript endpoint uses backend authorization. Learners can read their own record; platform admins can read across learners through the existing policy helper.

Tradeoff: organization admins and instructors do not yet have scoped transcript access. That should be added with manager dashboards and grading workflows so the access rules can be designed with real use cases.

## Verification

Command run:

- `npm run verify`

Final status: passes.

## Lessons Learned

Transcripts are derived views over durable records. The transcript itself should not become the only place learning history exists.

Version numbers matter. A learner's transcript should say which version of the course they took, because future course edits should not rewrite historical achievement.
