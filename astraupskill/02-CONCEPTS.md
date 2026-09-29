# 02. Understand the scope rule

An Actor has a role and organizationId. The existing audit-log policy treats
organization staff as organization-scoped, PLATFORM_ADMIN as cross-tenant,
and LEARNER as forbidden or empty depending on the projection. The dashboard
contract deliberately returns auditLogs: [] for learners, so the repair keeps
that response shape. A staff actor's visible set is
store.auditLogs.filter(log => log.organizationId === actor.organizationId).
Only after this filter should slice(0, 25) be applied.

Ordering matters. Suppose the store begins with twenty-five Nova records and
then one Acme record. Filtering after slice returns no Acme event, while
filtering before slice returns the Acme event. The latter is the correct
tenant projection and prevents record order from acting as an access rule.
Platform administrators intentionally receive the global first page because
their role is the documented cross-organization exception.

The rule concerns dashboard audit records. It does not claim that every other
dashboard collection is redesigned, that the in-memory store is a database,
or that JWT issuance becomes production authentication. Synthetic records
contain Acme and Nova organization IDs and no secrets. A useful review checks
both output and actor class: Acme staff cannot see Nova targets, platform
admins can see both, and learners have no audit entries. Keep those assertions
beside existing dashboard behavior so a future change cannot silently make
the dashboard and audit-log endpoint disagree again.

The projection also preserves paging semantics within the chosen scope. The
API exposes only a first page through slice(0, 25), so this fix adds no cursor
or page parameter. It makes page one the first twenty-five records the actor
may read. If a later feature adds paging, the organization predicate should
remain in the repository query or in-memory selection before offset and limit.
Keeping policy and paging in that order prevents a foreign tenant from
consuming the page budget.

## One predicate, two readers

The first version of this fix wrote the scope rule twice: once inside the dashboard helper and once inside
`services.auditLogs`. Two copies of `role === "PLATFORM_ADMIN" || log.organizationId === actor.organizationId`
is exactly how the two endpoints disagreed in the first place, so the rule is now a single exported function:

~~~ts
export function auditLogScope(actor: Actor) {
  return (log: { organizationId: string | null }) =>
    actor.role === "PLATFORM_ADMIN" || log.organizationId === actor.organizationId;
}
~~~

`visibleAuditLogs` (the dashboard projection) and `services.auditLogs` (the dedicated endpoint) both call it,
and `apps/api/src/audit-scope.test.ts` asserts the two endpoints return the same row ids for the same actor.
Read that as the general habit: when two endpoints project the same table, the ownership rule is one named
function that both call, and a test pins them together. The learner rule stays in each endpoint because it
genuinely differs - the dashboard returns `[]`, the dedicated endpoint returns 403.

## If this store were a database

Nothing here touches PostgreSQL, so translate before you carry the lesson into a Prisma or EF Core codebase:

| In-memory here | Prisma equivalent | EF Core equivalent |
| --- | --- | --- |
| `store.auditLogs.filter(auditLogScope(actor))` | `prisma.auditLog.findMany({ where: auditLogScope(actor) })` where the scope returns `{}` for a platform admin and `{ organizationId: actor.organizationId }` otherwise | `db.AuditLogs.Where(AuditLogScope(actor))` |
| `.slice(0, 25)` after the filter | `take: 25` in the *same* query as `where` | `.Take(25)` after `.Where(...)` |
| Filter-after-slice bug | `findMany({ take: 25 })` then filtering the array in JavaScript | `.Take(25).ToList().Where(...)` |

The database versions make the ordering mistake harder, because `where` and `take` belong to one query object -
but only if you resist fetching first and filtering in application code. That is the same bug in a new costume.
