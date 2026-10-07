# 07. Trace staff, platform and learner requests

Fill in the last column yourself before reading the next section. Each row is
one hop of `GET /me/dashboard` for `admin@acme.test`.

| # | Hop | Where | Data leaving this hop |
| --- | --- | --- | --- |
| 1 | `POST /auth/login` validates the body | `index.ts:38-40`, `loginRequestSchema` | `{ email, password }` |
| 2 | `services.login` finds the user | `services.ts:54-57` | `User` incl. `role: "ORG_ADMIN"`, `organizationId: "org-acme"` |
| 3 | `signUser` signs `{ sub: user.id }` for 8 h | `auth.ts:9-11` | JWT string |
| 4 | `requireAuth` verifies and re-reads the user | `auth.ts:17-25` | `req.actor = { id: "user-admin", role: "ORG_ADMIN", organizationId: "org-acme" }` |
| 5 | Route calls the service | `index.ts:47` | the `Actor` only - never the token |
| 6 | `visibleAuditLogs` learner check | `services.ts:33` | not a learner, continue |
| 7 | `filter(auditLogScope(actor))` | `services.ts:29, 34` | rows with `organizationId === "org-acme"` |
| 8 | `.slice(0, 25)` | `services.ts:34` | at most 25 of those rows |
| 9 | `res.json(...)` | `index.ts:47` | the whole dashboard object, `auditLogs` included |

Note hop 4: the actor's role and organization come from the **store**, not
from the token, so a role change takes effect on the next request even with
an old token. Only `sub` is trusted from the JWT.

## The same trace for the other two actors

- **`platform@lms.test`**: hop 4 yields `role: "PLATFORM_ADMIN",
  organizationId: null`. Hop 7's predicate returns `true` for every row, so
  hop 8 returns the newest 25 of all tenants. This exception is asserted
  separately (`api.test.ts:45-50`) so a future "filter everyone by
  organization" patch cannot silently remove it.
- **`learner@acme.test`**: hop 6 returns `[]` and hops 7-8 never run. The
  empty list does not depend on the store being empty, so a learner cannot
  infer whether any events exist.

## The other reader of the same array

`GET /audit-logs` (`index.ts:54-58`) validates the query with
`auditLogQuerySchema` (`pageSize` defaults to 25, max 100), then
`services.auditLogs` (`services.ts:134-145`) runs: learner -> throw
`"Forbidden"` (403 via `errors.ts:32`); the same `auditLogScope`; then the
`action` substring and `targetType` filters; then page arithmetic, with an
out-of-range `page` clamped to the last page. Scope first, paging last - the
same ordering rule as the dashboard.

## Where a screenshot would mislead you

The web client draws its audit panel from `/audit-logs?pageSize=10`
(`apps/web/src/main.tsx:68-70`), not from `dashboard.auditLogs`. Before the
fix the leaked Nova row was in the dashboard JSON yet never on screen. A UI
check could not have found this bug; only a response-level assertion could.

## A trace that ends somewhere else

Trace `POST /enrollments/enroll-security-lena/progress` by
`platform@lms.test` with `{ "lessonId": "lesson-data" }` through
`services.ts:173-188`. Which `organizationId` reaches `audit(...)` at line 186,
and can the Acme admin see the resulting row through either reader? (Answer: 06,
finding 1.)
