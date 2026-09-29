# 07. Trace staff, platform, and learner requests

For an Acme staff request, POST /auth/login verifies the seeded credentials and
returns a JWT. GET /me/dashboard passes through authentication, constructs an
Actor with role and organizationId, then calls services.dashboard. The helper
rejects the learner branch, rejects the platform branch, and reaches the
organization filter for staff. It compares each audit log's organizationId
with org-acme and applies the twenty-five-record limit. JSON serialization
returns the resulting dashboard.

For the platform request, the same route constructs PLATFORM_ADMIN. The helper
returns the first twenty-five global records. This is intentional operational
visibility and is asserted separately so a future “filter everyone” patch does
not remove the documented exception.

For a learner request, services.dashboard returns auditLogs: [] while still
producing the rest of the learner dashboard projection. The empty list is
visible in JSON and does not depend on the store having no records. That
distinction prevents a learner from inferring that the system simply lacked
events.

The trace ends at the local in-memory response. No SQL query, external audit
sink, or real identity provider is involved. The audit records are seeded
with stable Acme and Nova IDs solely to make the tenant boundary observable.
If the application later moves to Prisma, this helper's policy should become
an equivalent organization predicate in the repository query, with tests that
still distinguish staff, platform, and learner actors.

The response carries targetType and targetId, so tests should inspect those
fields rather than only top-level length. A foreign target must be absent from
staff JSON. This explains why a web-only screenshot is weak evidence: a UI can
hide an item after receiving it, while the API has already disclosed it. The
service projection removes the foreign object before serialization and keeps
the response boundary aligned with policy.

## The other end of the same trace

Trace the paginated endpoint beside the dashboard: the learner is refused outright, the same `auditLogScope` predicate runs before the query filters, and paging happens last — which is why a noisy tenant cannot push an owner's row off page one. From `apps/api/src/services.ts:134-145`:

```ts
  auditLogs(actor: Actor, query: { action?: string; targetType?: string; page: number; pageSize: number }) {
    if (actor.role === "LEARNER") throw new Error("Forbidden");
    const scoped = store.auditLogs
      .filter(auditLogScope(actor))
      .filter((log) => !query.action || log.action.includes(query.action))
      .filter((log) => !query.targetType || log.targetType === query.targetType);
    const total = scoped.length;
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const start = (page - 1) * query.pageSize;
    return { auditLogs: scoped.slice(start, start + query.pageSize), pagination: { page, pageSize: query.pageSize, total, totalPages } };
  },
```

