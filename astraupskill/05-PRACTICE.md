# 05. Predict the dashboard output

Use the seeded events audit-seeded-acme and audit-seeded-nova. The first has
organizationId org-acme and the second has organizationId org-nova. Predict
the results before running the test.

Exercise 1: an Acme instructor requests the dashboard. Which target IDs may
appear in auditLogs? Exercise 2: a platform administrator requests it. Why
does their list contain both organizations? Exercise 3: a learner requests
it. What is the exact JSON shape of auditLogs? Exercise 4: put twenty-six
Nova events before one Acme event and run the staff projection. Does the Acme
event appear on page one? Explain the order of filter and slice. Exercise 5:
compare dashboard auditLogs with the dedicated audit-log endpoint. What
shared scope decision should a reviewer expect?

The answers follow actor role and organization, not event actor or target
course. An Acme staff member cannot see Nova merely because the event's actor
is a platform user, and a Nova event cannot be made local by changing its
target label. A platform admin is the explicit cross-tenant exception. The
learner result is an empty array rather than an authorization error because
that is the dashboard contract already used by the code.

When inspecting the fixture after a request, do not expect records to be
deleted. dashboard reads and filters arrays. If you add the twenty-six-event
case, restore the fixture for the next actor or create a fresh store so the
test remains deterministic. This exercise tests the projection's boundary
and ordering without implying a full database authorization model.

As a debugging technique, inspect actor.role, actor.organizationId, and
candidate organization IDs at the helper boundary without printing tokens or
passwords. For Exercise 4, the useful observation is that the Acme event
survives because candidates were reduced to Acme before slice runs. If a trace
shows slice first, compare the implementation with the original snapshot.
Remove temporary logging after confirmation and rely on explicit IDs in the
regression. The lesson is complete when one policy explains all five answers
and the store remains unchanged.

## Exercise 4, restated now that the helpers exist

`apps/api/src/store.ts` exports `resetStore()` and `seedAuditLogs(count, organizationId, options?)`, so you no
longer edit the fixture by hand. Build the case like this and predict the two results before running it:

```ts
resetStore();
store.auditLogs.length = 0;
seedAuditLogs(1, "org-acme");
seedAuditLogs(26, "org-nova");
```

Predict: how many rows does `GET /me/dashboard` return for `admin@acme.test`, and how many for
`platform@lms.test`? Write both numbers down, then check them against `06-SOLUTIONS-AND-REVIEW.md`.

## Exercise 6 (red first): reintroduce the bug and measure it

Follow the "Break it first" steps in `04-TESTING-AND-DEBUGGING.md`. Before running anything, predict *which*
of the 22 tests will fail and with what message. Then run
`npx vitest run apps/api/src/api.test.ts apps/api/src/audit-scope.test.ts`, record the real failures, and
restore the fix. Compare your prediction with the output: a prediction that named the wrong test is the most
useful result you can get here, because it tells you which part of the path you had misread.

## Exercise 7 (write path): audit ownership on a create

`POST /courses` writes a `course.created` audit row through `audit(...)` in `apps/api/src/store.ts`. Predict:
if an Acme instructor creates a course and passes `organizationId: "org-acme"`, which organization ends up on
the audit row - the actor's, or the one in the request body? Then answer the harder question: what happens
today if a caller passes a *different* organization id in the body, and which function stops them? Name the
file and line before you look. (Hint: `assertCanAuthorCourse` in `apps/api/src/policies.ts`.) Write a test that
proves your answer; the shipped test in `audit-scope.test.ts` covers only the honest-caller case.
