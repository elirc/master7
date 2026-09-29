# 04. Build the local regression fixture

The meaningful test uses the real Express app and seeded in-memory store. It
logs in the Acme administrator using the repository's documented
password, obtains the returned token, and calls the dashboard endpoint with
that authorization. The response is then checked for the Acme seeded target
and the absence of the Nova seeded target. This is stronger than calling a
new helper in isolation because it exercises login, JWT middleware, route
dispatch, actor construction, services.dashboard, and JSON serialization.

The second actor is the seeded platform administrator. Their dashboard must
contain both Acme and Nova target IDs, demonstrating the deliberate global
exception. The third actor is the seeded learner. Their dashboard auditLogs
must be an empty array, matching the pre-existing product contract. Existing
dashboard fields remain present, so the regression should also check a normal
course or organization field to detect accidental projection replacement in
an extended exercise. The added audit regression itself checks the audit
field; the suite's other dashboard tests cover existing organization behavior.

The store records are synthetic and local. The test does not contact a real
database, identity provider, notification service, or external API. It proves
the service's in-memory response selection. A stronger follow-up can seed more
than twenty-five foreign records before one local event to assert that
filter-before-limit is preserved; the current two-organization case catches
the original global leak and is sufficient for this bounded slice.

Use explicit target IDs instead of checking only a count. A count of one could
pass if the wrong tenant's single record were returned. Checking inclusion and
exclusion documents the boundary. The platform assertion should check both
seeded IDs, and the learner assertion should check deep equality with an empty
array. If the API returns an error, preserve response body and status in the
raw test log so a reviewer can distinguish authentication failure from
projection failure. Keep fixtures deterministic and avoid random expected IDs.
Read [the actual API tests](../apps/api/src/api.test.ts) alongside the raw run
record. The new staff assertion combines a nonempty list, an organization
predicate for every returned record, and exclusion of `version-forklift-v1`.
That nonempty check matters because `[].every(...)` is true: an implementation
that accidentally hid all records would otherwise pass the ownership check.


## Running the fixture

The suite is Vitest at the repository root; `verify` is the ordered gate the repository uses, and it stops at the first failure rather than reporting a build over a red test. From the root `package.json`, `scripts`:

```bash
npm test     # vitest run
npm run verify   # db:validate && typecheck && test && build
```

## Break it first (do this before reading 05)

You learn more from a red test than from a green one. This project ships the exact pre-change source in
`astraupskill/snapshots/`, so you can reintroduce the bug and measure it.

1. Note the current state: `npm test` -> `Test Files 4 passed (4) / Tests 22 passed (22)`.
2. Open `apps/api/src/services.ts` and replace the body of `visibleAuditLogs` with the original expression
   from `snapshots/services-before.ts.txt`:
   `auditLogs: actor.role === "LEARNER" ? [] : store.auditLogs.slice(0, 25)` (it lives inline in `dashboard`
   in the snapshot; putting the unscoped `slice` back in the helper is equivalent for this exercise).
3. Run only the affected files: `npx vitest run apps/api/src/api.test.ts apps/api/src/audit-scope.test.ts`.
4. Record which tests turn red and the exact assertion message. Expect
   `scopes dashboard audit logs by organization while platform admins see both tenants` to fail on
   `expect(adminResult.auditLogs.every(...)).toBe(true)`, and the filter-before-limit test in
   `audit-scope.test.ts` to fail with `expected length 1, received 25` or similar.
5. Restore the fix (`git checkout -- apps/api/src/services.ts`, or paste the scoped version back) and rerun
   until you are green again.

Then do the same with the *shared predicate*: change only `services.auditLogs` to use its own copy of the
comparison, with `log.organizationId === actor.organizationId` and no `PLATFORM_ADMIN` branch. The dashboard
test stays green and `returns the same audit rows on the dashboard and on /audit-logs for the same actor`
turns red. That is the test whose whole job is to stop the two projections drifting apart again.

## The three tests added in `audit-scope.test.ts`

- **Agreement**: for an org admin and for a platform admin, `GET /me/dashboard` and `GET /audit-logs?pageSize=25`
  return the same row ids. This is the test the concepts chapter argues for.
- **Filter before limit**: `resetStore()`, empty `store.auditLogs`, then `seedAuditLogs(1, "org-acme")` and
  `seedAuditLogs(26, "org-nova")`. The Acme admin must still see their single row; the platform admin sees 25
  (the limit). Without the helpers this fixture had to be hand-written in the test.
- **Write path**: an Acme instructor `POST /courses`, and the emitted `course.created` audit row must carry the
  *actor's* `organizationId`. The same row is then visible to the Acme admin and excluded by
  `auditLogScope` for a Nova admin. Who writes an audit row and who may read it are the two halves of one rule.

Every test calls `resetStore()` in `afterEach`, so the shared in-memory singleton cannot leak a fixture into
the next test.
