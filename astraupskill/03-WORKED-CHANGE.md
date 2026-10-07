# 03. Read the before and after

Diff [snapshots/services-before.ts.txt](snapshots/services-before.ts.txt)
against `apps/api/src/services.ts`. Ignoring line endings, there are exactly
three hunks.

**1. A shared predicate and a dashboard helper are added (current lines 28-35):**

```ts
export function auditLogScope(actor: Actor) {
  return (log: { organizationId: string | null }) => actor.role === "PLATFORM_ADMIN" || log.organizationId === actor.organizationId;
}

function visibleAuditLogs(actor: Actor) {
  if (actor.role === "LEARNER") return [];
  return store.auditLogs.filter(auditLogScope(actor)).slice(0, 25);
}
```

**2. The dashboard field uses the helper (current line 70):**

```diff
-      auditLogs: actor.role === "LEARNER" ? [] : store.auditLogs.slice(0, 25)
+      auditLogs: visibleAuditLogs(actor)
```

**3. The dedicated endpoint drops its private copy of the rule (current line 137):**

```diff
-      .filter((log) => actor.role === "PLATFORM_ADMIN" || log.organizationId === actor.organizationId)
+      .filter(auditLogScope(actor))
```

Hunk 3 changes no behavior; it removes the second copy of the rule so a future
edit cannot change one reader without the other.

## Why it is shaped this way

- The learner branch stays an explicit early return because the dashboard
  contract (`[]`) differs from the endpoint's (403).
- The platform exception lives inside the predicate, so both readers treat a
  platform admin identically.
- `filter` runs before `slice`, so a busy tenant cannot push another tenant's
  rows off the first page.
- `filter` and `slice` both return new arrays; `store.auditLogs` is never
  reordered or mutated by a read.

## Test-support changes in the store

Diffing `snapshots/store-before.ts.txt` against `apps/api/src/store.ts` shows
two additions:

- The seed's `auditLogs` was `[]`. It now holds `audit-seeded-acme` and
  `audit-seeded-nova` (`store.ts:155-158`). Without a row from each tenant,
  the leak could not be observed at all - an empty fixture passes every
  ownership assertion.
- Two exported helpers (lines 161-177): `resetStore()` restores a deep copy
  of the fixture captured at module load, and `seedAuditLogs(count,
  organizationId, options?)` `unshift`s synthetic rows with ids like
  `audit-org-nova-1`.

`snapshots/api-tests-before.ts.txt` differs from `api.test.ts` by one added
test (the dashboard scope regression, `api.test.ts:35-58`), and
`snapshots/audit-feature-before.md.txt` is the earlier text of
`docs/features/07-audit-log-viewer.md`.

## What was deliberately not changed

No package manifest, lockfile, JWT format, web route, or audit *writer* was
touched. The writers that stamp `actor.organizationId` (01, "Who writes audit
rows") are a separate problem with their own test, covered in 06.
