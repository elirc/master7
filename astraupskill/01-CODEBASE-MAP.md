# 01. Map the actual LMS request

The active project is the repository root, an npm workspace with an Express
API in apps/api and a Vite web client in apps/web. The API route wiring lives
in apps/api/src/index.ts. Login returns a JWT for a seeded actor; subsequent
requests pass through the auth middleware before services.dashboard receives
an Actor. The dashboard response is assembled in apps/api/src/services.ts.
Its organizations, courses, enrollments, progress, attempts, submissions,
certificates, reports, and auditLogs fields are projections over the shared
in-memory store.

The audit-log endpoint already calls the scoped service path. The dashboard
had a different expression: learners received an empty list, but every other
role received store.auditLogs.slice(0, 25). That global slice meant an Acme
instructor could see Nova's audit records whenever Nova's record appeared in
the first twenty-five entries. The issue is a tenant-boundary defect in a
projection, not a persistence or JWT defect.

The bounded repair adds visibleAuditLogs(actor) in services.ts. It returns an
empty list for LEARNER, all first twenty-five records for PLATFORM_ADMIN, and
records matching actor.organizationId for other roles, with the limit applied
after filtering. dashboard calls that helper. Seeded Acme and Nova records
make the difference observable. This map identifies the request path so a
reviewer can distinguish the real Express test from a direct helper test and
can see why the web UI does not need a source change.

Keep the names separate. The event actorId identifies who performed an action,
while organizationId identifies the tenant that owns the record. The dashboard
decision uses the latter. A platform actor may be recorded for an Acme event,
but that does not make it visible to every organization. Changing a displayed
course name or actor label must not change that ownership decision. Follow
`GET /me/dashboard` in [the route wiring](../apps/api/src/index.ts), then inspect
[the service](../apps/api/src/services.ts) to see where the decision is made.
