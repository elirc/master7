# 03 - Authorization Policy Layer

## Goal

Move role and organization checks out of ad hoc service conditionals into a small policy layer. This teaches how enterprise codebases keep access rules readable as workflows multiply.

## Impacted Codebase Areas

- `apps/api/src`
- `packages/domain`
- API tests
- Architecture and system design docs

## Implementation Approach

Create `apps/api/src/policies.ts` with explicit policy functions and a `ForbiddenError`. Refactor service workflows to call named policies. Add tests around organization isolation and learner/instructor boundaries.

## Design Considerations

Policies should receive an actor plus the resource context they need. They should not query the database directly in this slice; services still load records and pass the relevant organization/user IDs. This keeps the policy layer deterministic and easy to test.

## Build Journal

Implemented `apps/api/src/policies.ts` with named policy assertions and a `ForbiddenError`. Refactored service workflows so course authoring, publishing, enrollment, learner-record access, assignment grading, and certificate requests call explicit policy functions.

This connects to the rest of the system by making authorization a first-class backend concept. Controllers still validate HTTP input, services still own workflows, and policies now own access decisions.

Added policy tests for cross-organization authoring, instructor grading boundaries, and learner record access. Added a code walkthrough so a junior developer can see where authorization lives and why it is separate from frontend role-based UX.

Tradeoff: policies are deterministic functions that receive already-loaded resource context. A production system might add repository-backed policy composition, but this simpler shape is easier to test and avoids hiding database reads inside authorization helpers.

## Verification

Command run:

- `npm run verify`

Final status: passes.

## Lessons Learned

Authorization should be boring, named, and testable. If a developer must hunt through services to understand who can do what, the codebase will become risky as features grow.

Backend policy checks are security. Frontend role checks are usability. Both matter, but they are not interchangeable.
