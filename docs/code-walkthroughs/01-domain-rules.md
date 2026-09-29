# Domain Rules Walkthrough

File: `packages/domain/src/index.ts`

This file defines shared roles, lifecycle states, and reusable business helpers. It exists so important rules are not copied into controllers or frontend components.

Important exports include `Role`, `Actor`, `canManageOrganization`, `canAuthorCourse`, `canLearnInOrganization`, `publishDraft`, `completeLesson`, `gradeQuiz`, and `issueCertificateInput`.

The API service calls these helpers when creating courses, publishing versions, tracking progress, grading quizzes, and deciding whether a certificate can be issued.

Invariants protected:

- Instructors author only inside their organization.
- Published drafts cannot be republished through the normal state transition.
- Quiz scores stay between 0 and 100.
- Certificates require durable completion inputs.

Change this file carefully because a small rule change can affect API authorization, reporting, and future UI behavior.
