# Authorization Policies Walkthrough

File: `apps/api/src/policies.ts`

This file names the API authorization rules. Services load the relevant resource data, then call a policy with the actor and resource context.

Important exports:

- `ForbiddenError`
- `assertCanAuthorCourse`
- `assertCanLearnInOrganization`
- `assertCanManageOrganization`
- `assertCanAccessOwnLearnerRecord`
- `assertCanGradeLearnerWork`

The senior-level idea is that policy functions should be boring and testable. They should not know about HTTP, React, or controller details. As the app grows, this layer prevents authorization checks from being scattered across unrelated workflows.
