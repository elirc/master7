# Master7: protect audit data in every response

Start with a small but important CRUD application question: when an organization administrator opens a dashboard, whose audit records may appear in its JSON? Master7 already restricted its dedicated audit endpoint, but the dashboard assembled a separate response containing the newest global records. This course follows the fix that applies organization scope to that second read path. You will practice tracing authorization through the actual HTTP route, service and in-memory data store.

The application is a learning management system with organizations, courses, enrollments, progress, submissions and certificates. Its root npm workspace contains an Express API, a Vite web client and shared contracts/domain packages. The current running services use the synthetic in-memory store. A Prisma schema is also present, but these dashboard tests do not use a persistent database. Keeping that distinction clear is part of learning to assess a codebase accurately.

Read the chapters in this order:

1. [Codebase map](01-CODEBASE-MAP.md): follow login, actor resolution and the dashboard request to its response projection.
2. [Concepts](02-CONCEPTS.md): distinguish authentication, organization authorization and filtering before a result limit.
3. [Worked change](03-WORKED-CHANGE.md): compare the global slice with the scoped implementation.
4. [Testing and debugging](04-TESTING-AND-DEBUGGING.md): understand the seeded two-organization fixture and actual local HTTP regression.
5. [Practice](05-PRACTICE.md): predict staff, platform administrator and learner responses, including a limit boundary.
6. [Solutions](06-SOLUTIONS-AND-REVIEW.md): check those predictions against complete examples and explain each assertion.
7. [Trace lab](07-TRACE-LAB.md): account for every step from the synthetic actor to the returned audit list.
8. [Verification](VERIFICATION.md): reproduce the run (nineteen tests as delivered, twenty-three after the follow-up pass), type check and build, then read their limits.

Use the exact original [service](snapshots/services-before.ts.txt), [store](snapshots/store-before.ts.txt) and [test](snapshots/api-tests-before.ts.txt) snapshots for before/after study. They have a `.txt` suffix so they cannot accidentally become compiled duplicate source. Preserve the existing broader project documentation; this course focuses on one concrete defect rather than claiming to explain every enrollment workflow.

By the end, you should be able to explain why a correct audit endpoint did not protect the separate dashboard projection, write a negative test with another organization's record, and justify filtering before slicing. A good review answer identifies both the protection and its boundary: the local HTTP test checks response ownership, while persistent database isolation and browser behavior need different evidence. Use that habit when moving from junior implementation work toward independent feature reviews.

## Before you start (prerequisites)

You should be able to read TypeScript function bodies, run `npm` scripts, and read a JSON HTTP response.
You do **not** need Prisma, Docker, SQL or React knowledge for this course: the data here lives in a plain
JavaScript object in `apps/api/src/store.ts`. If you have never seen a JSON Web Token, read only this much:
`POST /auth/login` returns a signed string, and the API turns that string back into an `Actor` on each request.

## Time estimates

| Chapter | Budget | What you produce |
| --- | --- | --- |
| 01 Codebase map | 30 min | A sketch of login -> actor -> dashboard -> response |
| 02 Concepts | 30 min | An explanation of filter-before-limit in your own words |
| 03 Worked change | 45 min | The before/after diff read against the snapshot |
| 04 Testing and debugging | 45 min | A failing test you caused on purpose, then made green again |
| 05 Practice | 60-90 min | Written predictions for seven exercises |
| 06 Solutions | 45 min | Your predictions checked against runnable code |
| 07 Trace lab | 30 min | Every hop from token to returned array named |
| VERIFICATION | 30 min | A reproduced local run whose numbers you compared |

Total: roughly one focused day, or two evenings.

## Glossary

- **Actor**: the `{ id, role, organizationId }` object the API derives from the bearer token (`packages/domain/src/index.ts:9`). Everything in this course is a question about the actor.
- **Tenant / organization**: one customer's data boundary. `org-acme` and `org-nova` are the two seeded tenants.
- **Projection**: the subset and shape of stored data that one endpoint chooses to return. The dashboard and `/audit-logs` are two projections over the same `store.auditLogs` array.
- **Scope predicate**: a function that answers "may this actor see this row?". Here it is `auditLogScope(actor)` in `apps/api/src/services.ts`.
- **Audit log**: an append-only record of who did what to which resource, written by `audit(...)` in `apps/api/src/store.ts`.
- **Page limit / slice**: `slice(0, 25)` - the maximum number of rows the dashboard returns. Whether it runs before or after the scope predicate is the whole lesson.
- **Optimistic vs. defensive**: not used here; if you meet those words in the sibling courses (master2, master3, master4) they concern concurrent writes, which this read-only lesson does not cover.
- **Regression test**: a test written so that the bug, if reintroduced, turns the test red.

## What you can check from inside this repository

`evidence/` holds the raw logs for every number this course claims, including `tests-root-02.log` for the
current 22-test run. `snapshots/` holds the exact pre-change source. You never have to trust a claim here.
