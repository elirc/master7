# 06. Solutions and review

## Answers to 05

**Exercise 1.** Acme admin and Acme instructor: `["version-security-v1"]`
only - both roles take the same non-platform branch of `auditLogScope`.
Platform admin: both seeded targets, newest first (`unshift` order). Learner:
`[]` with status 200, even though the store holds rows; the learner branch
returns before the predicate runs. The dedicated endpoint answers the learner
with 403 instead - two contracts, both tested (`api.test.ts:35-58` and
`:139-144`).

**Exercise 2.** Current code: Acme admin gets 1 row (Acme), platform admin
gets 25 of the 27 rows. Original code: `store.auditLogs.slice(0, 25)` takes
the 25 newest rows, all of them Nova, and applies no filter, so the Acme admin
receives 25 foreign rows and none of their own - a leak and a loss at once.
If the original had filtered *after* slicing, it would have returned zero
rows: no leak, but the owner's row silently disappears.

**Exercise 3.** It is the service-level twin of the agreement test,
`audit-scope.test.ts:31-42`. Against the original code the endpoint returns
`["audit-seeded-acme"]` while the dashboard returns both seeded rows, so the
agreement assertion alone would have caught the bug.

**Exercise 4.** (a) `null` - `completeLesson` stamps `actor.organizationId`
(`services.ts:186`), and a platform admin has none, so the Acme admin's view
never contains a record of someone changing an Acme learner's progress.
(b) `org-acme` - `createCourse` stamps the body's `organizationId`
(`services.ts:150`), which `assertCanAuthorCourse` has just authorized. Fix
for (a): destructure `course` from `enrollmentContext(enrollmentId)` at line
174 and call `audit(actor.id, course.organizationId, "lesson.completed", ...)`.
See finding 1.

**Exercise 5.** Today all four are 403, 403, 403, 404. Better: publishing an
already-published course is a state conflict (409); a lesson from another
version is invalid input (400 or 422), not a permission failure; and the last
two should be indistinguishable (both 404, or both 403). See findings 2 and 3.

**Exercise 6.** Each call appends a new `ISSUED` certificate with a new
`verificationId`, so Lena ends up with three. A guard at the top of
`issueCertificate` would return the existing `ISSUED` certificate for the
enrollment; the test calls twice and asserts the same `verificationId` and an
unchanged count. See finding 4.

The break-it drill's answer (three red tests, which ones, and why the learner
assertion stays green) is in 04, "Break it first".

## Review findings still open in the code

Each was verified by reading the cited lines; findings 1-4 are also
demonstrated by the 05 checks.

### 1. Audit rows stamped with the actor's tenant, not the resource's

`completeLesson`, `submitQuiz` and `submitAssignment` call
`audit(actor.id, actor.organizationId, ...)` (`services.ts:186, 200, 212`).
For a learner the two values coincide, because `enroll` requires
`canLearnInOrganization` (`services.ts:167`). But
`assertCanAccessOwnLearnerRecord` (`policies.ts:22-26`) lets a
`PLATFORM_ADMIN` complete any learner's lesson, and that row gets
`organizationId: null` - invisible to the tenant whose data changed. The
course's fix scoped the *readers*; this is the matching *writer* defect.
Severity: medium (compliance trail gap, no data exposure).

### 2. Error status chosen by regex over the message

`toAppError` (`errors.ts:31-32`) returns 404 for any message containing "not
found" and 403 for "forbidden", "does not belong", "cannot" or "only the".
Consequences:

- `publishDraft` throws `Cannot publish course draft from PUBLISHED`
  (`packages/domain/src/index.ts:29`) -> 403 instead of 409. Because nothing
  ever moves a course back to `DRAFT`, the version-numbering expression at
  `services.ts:158` can only ever produce version 1 through the API.
- `Lesson does not belong to this enrollment version` (`services.ts:177`) ->
  403, and `api.test.ts:98-107` pins that 403, so the test encodes the
  misclassification.
- `gradeQuiz`'s `Quiz score must be between 0 and 100`
  (`domain/src/index.ts:40`) matches nothing -> 500 for a data problem.
- Rewording any message silently changes the HTTP contract.

Fix direction: throw typed errors (`ConflictError`, `ValidationError`
already exists at `errors.ts:22-26`) and map by class, not text.

### 3. Existence checked before authorization (id oracle)

`publishCourse` returns 404 for an unknown id but 403 for another tenant's
course (`services.ts:154-156`): the lookup happens before
`assertCanAuthorCourse`. The same order appears in `enroll` (164-167),
`completeLesson` (174-176) and `gradeAssignment` (216-220). Seeded ids are
readable slugs (`course-forklift`), so an Acme user can confirm which ids
exist in Nova. Fix: resolve the resource *within* the actor's visible scope
and return the same 404 when it is absent or foreign.

### 4. Certificate issuance is not idempotent

`issueCertificate` (`services.ts:227-242`) always pushes a new certificate,
`ISSUED` or `PENDING`, with a fresh `verificationId`. Retries or double clicks
create multiple valid public verification links for one enrollment, and the
public `GET /certificates/verify/:id` (`index.ts:33-37`,
`services.ts:119-133`) returns the learner's name for every one of them,
including `PENDING` records. Fix: return the existing `ISSUED` certificate,
and decide whether `PENDING` rows should be stored at all.

### 5. Teaching-grade credentials

`services.login` compares plaintext passwords (`services.ts:55`; the `User`
type stores `password: string`, `store.ts:4`). `bcryptjs` is declared in both
`package.json` files but imported nowhere. `JWT_SECRET` defaults to
`"local-learning-secret"` (`packages/config/src/index.ts:6`), so any process
started without that variable accepts tokens anyone can sign, for example
with `sub: "user-platform"`. Fine for a local demo; a blocker for any shared
deployment. Fix: hash at seed time and compare with `bcrypt.compare`; make
`JWT_SECRET` required outside `NODE_ENV=development|test`.

### 6. Duplicate enrollments

`enroll` (`services.ts:163-172`) never checks for an existing enrollment for
the same learner and version, so repeated calls create parallel enrollments
with separate progress. Low severity here; in a database this becomes a
unique constraint on `(learnerId, courseVersionId)`.

## What the shipped tests do and do not prove

They prove response selection and the write-path tenant check for the tested
actors over the in-memory store, through real HTTP. They do not prove
row-level security in a database, behavior after restart, browser rendering,
or any of findings 1-6.
