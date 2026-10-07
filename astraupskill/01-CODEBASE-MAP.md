# 01. Map the actual LMS request

All routes are wired in one function, `createApp()` in
[apps/api/src/index.ts](../apps/api/src/index.ts). Read it top to bottom; the
order of `app.use` calls is the security model.

| Lines | What happens |
| --- | --- |
| 28-30 | `cors()`, `express.json()`, `requestLogger` (sets/echoes `x-request-id`) |
| 32 | `GET /health` - public |
| 33-37 | `GET /certificates/verify/:verificationId` - public |
| 38-44 | `POST /auth/login` - public; validates with `loginRequestSchema`, returns a JWT |
| 46 | `app.use(requireAuth)` - every route below needs a bearer token |
| 47 | `GET /me/dashboard` -> `services.dashboard(req.actor!)` |
| 54-58 | `GET /audit-logs` -> `services.auditLogs(req.actor!, query)` |
| 59-94 | course, enrollment, progress, quiz, assignment, certificate writes |
| 96 | `errorMiddleware` - turns thrown errors into JSON status codes |

## From token to actor

`requireAuth` ([auth.ts](../apps/api/src/auth.ts) lines 17-29) verifies the
token with `config.JWT_SECRET`, looks the `sub` up in `store.users`, and sets
`req.actor = { id, role, organizationId }` (line 24). Services never see the
token, only this `Actor`. `services.login` (services.ts line 55) compares the
submitted password with the stored plaintext string.

## From actor to dashboard JSON

`services.dashboard` ([services.ts](../apps/api/src/services.ts) lines 58-72)
assembles ten fields. Besides the echoed `actor`, eight are derived from
`visibleScope(actor)` (lines 9-21:
platform admins see every organization, everyone else their own; learners see
only their own enrollments). The tenth is `auditLogs: visibleAuditLogs(actor)`
(line 70), which is the line this course is about:

```ts
// services.ts:28-35
export function auditLogScope(actor: Actor) {
  return (log: { organizationId: string | null }) => actor.role === "PLATFORM_ADMIN" || log.organizationId === actor.organizationId;
}

function visibleAuditLogs(actor: Actor) {
  if (actor.role === "LEARNER") return [];
  return store.auditLogs.filter(auditLogScope(actor)).slice(0, 25);
}
```

Before the fix, line 70 read `actor.role === "LEARNER" ? [] :
store.auditLogs.slice(0, 25)` - every non-learner got the newest 25 rows from
every tenant.

The dedicated reader, `services.auditLogs` (lines 134-145), throws
`Error("Forbidden")` for learners (mapped to 403 by the `/forbidden/i` regex
in `errors.ts:32`), applies the same `auditLogScope`, then the optional
`action` / `targetType` filters, then paging.

## Who writes audit rows

`audit(actorId, organizationId, ...)` ([store.ts](../apps/api/src/store.ts)
lines 179-181) `unshift`s, so the newest row is first. Each service picks the
`organizationId` it stamps: `createCourse`, `publishCourse`, `enroll`,
`gradeAssignment` and `issueCertificate` use the *resource's* organization;
`completeLesson`, `submitQuiz` and `submitAssignment` use
`actor.organizationId` (lines 186, 200, 212). That choice decides who can later
read the row - 06 shows where it goes wrong.

## Two identifiers, two meanings

A row's `actorId` says who acted; its `organizationId` says which tenant owns
the record. Visibility uses only `organizationId`. The seeded Nova row
(`store.ts:157`) was written by `user-platform`, yet it belongs to Nova, so an
Acme admin must not see it.

## What the UI shows

The web client ([apps/web/src/main.tsx](../apps/web/src/main.tsx) lines
63-73) renders its audit panel from `GET /audit-logs?pageSize=10`, **not** from
`dashboard.auditLogs`. The leak was therefore invisible on screen and present
in the dashboard JSON - a concrete reason to test the API response, not a
screenshot.
