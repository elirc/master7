# 03. Read the before and after

The original dashboard branch in apps/api/src/services.ts was, as preserved
in the [exact original snapshot](snapshots/services-before.ts.txt):

~~~ts
auditLogs: actor.role === "LEARNER" ? [] : store.auditLogs.slice(0, 25)
~~~

The source change introduces a single projection helper:

~~~ts
function visibleAuditLogs(actor: Actor) {
  if (actor.role === "LEARNER") return [];
  if (actor.role === "PLATFORM_ADMIN") return store.auditLogs.slice(0, 25);
  return store.auditLogs
    .filter((log) => log.organizationId === actor.organizationId)
    .slice(0, 25);
}
~~~

dashboard now assigns auditLogs: visibleAuditLogs(actor). The helper is
intentionally close to the existing audit-log service rule and keeps the
learner and platform branches explicit. The filter precedes the page limit,
so a tenant's records are not displaced by another tenant's first page.

The store adds synthetic Acme and Nova events with stable IDs and organization
IDs. The API regression logs in seeded users, requests dashboard data, and
asserts visible target IDs. It therefore catches the old global slice while
also preserving platform and learner behavior. The feature document records
the behavior and its teaching limits. No package manifest, lockfile, JWT
format, or web route changes are required for this slice.

The helper returns new arrays for staff and platform branches, while the
learner branch creates a fresh empty literal. It does not reorder or remove
store.auditLogs, which matters to the following request and to fixture
comparisons. The algorithm remains correct when foreign records outnumber
local records because the predicate executes before the page limit. A
reviewer can compare the original snapshot with this replacement and identify
the behavioral delta without inferring an unrelated redesign.

This keeps the audit projection deterministic for every ordinary staff actor.

## The shipped predicate

The replacement is two small functions: one exported predicate that both readers share, and the dashboard branch that still returns nothing for a learner. From `apps/api/src/services.ts:28-35`:

```ts
export function auditLogScope(actor: Actor) {
  return (log: { organizationId: string | null }) => actor.role === "PLATFORM_ADMIN" || log.organizationId === actor.organizationId;
}

function visibleAuditLogs(actor: Actor) {
  if (actor.role === "LEARNER") return [];
  return store.auditLogs.filter(auditLogScope(actor)).slice(0, 25);
}
```

## Follow-up change: extracting the shared predicate

After the first repair the scope expression existed in two places. The current source extracts it once:

~~~ts
// apps/api/src/services.ts
export function auditLogScope(actor: Actor) {
  return (log: { organizationId: string | null }) =>
    actor.role === "PLATFORM_ADMIN" || log.organizationId === actor.organizationId;
}

function visibleAuditLogs(actor: Actor) {
  if (actor.role === "LEARNER") return [];
  return store.auditLogs.filter(auditLogScope(actor)).slice(0, 25);
}
~~~

and `services.auditLogs` now reads `.filter(auditLogScope(actor))` in place of its own copy of the same
comparison. Behavior is identical - the point is that a future edit cannot change one reader without the
other. `apps/api/src/audit-scope.test.ts` holds the test that enforces it.

Two teaching helpers were added to `apps/api/src/store.ts` at the same time, because the practice chapter
asks you to build a bigger fixture and the old advice was "edit `store.ts` by hand":

~~~ts
export function resetStore(): void;                       // restore the seeded demo fixture
export function seedAuditLogs(count: number, organizationId: string, options?): void;
~~~
