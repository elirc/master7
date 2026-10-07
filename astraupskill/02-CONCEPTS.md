# 02. Understand the scope rule

## Authentication is not authorization

`requireAuth` answers "who is calling?". It says nothing about which rows that
caller may read. Every projection must still apply an organization rule, and
the dashboard is a projection like any other. Having one correctly scoped
endpoint (`/audit-logs`) did not protect a second reader of the same array.

## The rule, per role

| Role | Dashboard `auditLogs` | `GET /audit-logs` |
| --- | --- | --- |
| `LEARNER` | `[]` (200) | 403 |
| `INSTRUCTOR`, `ORG_ADMIN` | rows where `log.organizationId === actor.organizationId` | same rows, plus filters and paging |
| `PLATFORM_ADMIN` | every row (the documented cross-tenant exception) | every row |

The learner difference is deliberate and stays in each reader: the dashboard
contract returns an empty list, the dedicated endpoint refuses outright.

## Filter before limit

Suppose the store holds 26 Nova rows followed by 1 Acme row (newest first).

- `slice(0, 25)` then filter: the slice contains only Nova rows, so the Acme
  admin gets **zero** rows - and, with no filter at all, 25 Nova rows.
- filter then `slice(0, 25)`: the Acme admin gets their **one** row.

The second order is the only correct one: otherwise row order, which another
tenant controls just by being busy, becomes an access rule. 05 Exercise 2
measures both orders against the real current code and the original snapshot.

## One predicate, two readers

The first version of the fix wrote the comparison twice. Two copies of
`role === "PLATFORM_ADMIN" || log.organizationId === actor.organizationId` is
exactly how the two endpoints came to disagree, so the current code exports a
single `auditLogScope(actor)` (`services.ts:28-30`) and both
`visibleAuditLogs` (line 34) and `services.auditLogs` (line 137) call it.
`apps/api/src/audit-scope.test.ts:31-42` then asserts the two endpoints return
the same row ids for the same actor. General habit: when two endpoints project
the same table, the ownership rule is one named function, and a test pins the
readers together.

## The write side of the same rule

Visibility is decided by the `organizationId` stamped at write time. A reader
predicate can be perfect and still hide or leak a row if the writer stamped
the wrong tenant. The worked change does not touch writers; 06 shows one that
stamps `actor.organizationId` (null for a platform admin) instead of the
enrollment's organization.

## If this store were a database

| In-memory here | Prisma | EF Core |
| --- | --- | --- |
| `store.auditLogs.filter(auditLogScope(actor))` | `findMany({ where: scopeWhere(actor) })`, where `scopeWhere` returns `{}` for a platform admin and `{ organizationId }` otherwise | `.Where(scope)` |
| `.slice(0, 25)` after the filter | `take: 25` in the *same* query | `.Take(25)` after `.Where(...)` |
| the original bug | `findMany({ take: 25 })`, then filter the array in JavaScript | `.Take(25).ToList().Where(...)` |

The Prisma schema's `AuditLog.organizationId` is nullable
(`packages/database/prisma/schema.prisma:224`), just like the in-memory type,
so the "null organization" case in 06 would survive a move to the database.
