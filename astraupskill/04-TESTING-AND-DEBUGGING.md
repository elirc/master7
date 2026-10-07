# 04. Test the projection over real HTTP

## What the suite contains

`npm test` runs `vitest run` at the root. With no `vitest.config` file, Vitest
picks up every `*.test.ts`: **23 tests in 4 files**.

| File | Tests | Level |
| --- | --- | --- |
| `apps/api/src/api.test.ts` | 11 | real Express app over HTTP |
| `apps/api/src/audit-scope.test.ts` | 4 | real Express app over HTTP, plus direct store reads |
| `apps/api/src/policies.test.ts` | 4 | pure policy functions |
| `packages/domain/src/domain.test.ts` | 4 | pure domain functions |

Both API files use the same `request()` helper: `createApp()`,
`app.listen(0)` on an ephemeral port, `fetch`, then `server.close()`. A
request therefore exercises login, JWT verification, route dispatch, actor
construction, the service, error mapping and JSON serialization - stronger
than calling `visibleAuditLogs` directly. Running it needs `npm ci` first
(there is no `node_modules` in a fresh clone). The 05 checks need no install.

## The dashboard regression (`api.test.ts:35-58`)

Three actors, three assertion styles:

- **Acme admin**: `auditLogs.length > 0`, *every* row has
  `organizationId === "org-acme"`, and `version-forklift-v1` is absent. The
  non-empty check matters because `[].every(...)` is `true` - an
  implementation that hid all rows would otherwise pass.
- **Platform admin**: target ids contain both `version-security-v1` and
  `version-forklift-v1`.
- **Learner**: `auditLogs` deep-equals `[]`, with status 200.

Explicit target ids beat counts: a count of one passes if the wrong tenant's
single row comes back.

## The four tests in `audit-scope.test.ts`

1. **Agreement** (lines 31-42): for the Acme admin and the platform admin, the
   dashboard and `GET /audit-logs?page=1&pageSize=25` return the same row ids.
2. **Filter before limit** (44-61): empty the log, `seedAuditLogs(1,
   "org-acme")`, then `seedAuditLogs(26, "org-nova")`. Acme admin sees exactly
   1 row; platform admin sees exactly 25.
3. **Write path** (63-85): an Acme instructor `POST /courses`; the
   `course.created` row carries `org-acme`, is visible to the Acme admin via
   `/audit-logs`, and is excluded by `auditLogScope` for a synthetic Nova
   admin.
4. **Cross-tenant write refused** (87-96): the same instructor names
   `org-nova` in the body; 403 and no `course.created` row for Nova.

`afterEach(resetStore)` (line 26) restores the shared singleton so no fixture
leaks into the next test. Note that `api.test.ts` has **no** such hook; its
tests only stay independent because none of them depends on the exact
contents of arrays the others append to.

## Break it first

After `npm ci`, confirm `Test Files 4 passed (4)` / `Tests 23 passed (23)`.

1. In `apps/api/src/services.ts`, change `visibleAuditLogs` to
   `return store.auditLogs.slice(0, 25);` after the learner early return
   (equivalent to the snapshot's inline expression).
2. Run `npx vitest run apps/api/src/api.test.ts apps/api/src/audit-scope.test.ts`.
3. Expect exactly **three** red tests:
   - `api.test.ts` dashboard regression, on the `every(... === "org-acme")`
     assertion (the Nova row is now in the Acme list);
   - audit-scope **agreement**, because the dashboard is now global while
     `/audit-logs` is still scoped;
   - audit-scope **filter-before-limit**, on `toHaveLength(1)` - it received
     25 Nova rows.
   The learner assertion, the write-path test and the refusal test stay green.
4. Restore with `git checkout -- apps/api/src/services.ts`.

Second drill: make only `services.auditLogs` use its own
`log.organizationId === actor.organizationId` (no platform branch). Now only
the agreement test fails - a platform admin's endpoint list becomes empty
because no seeded row has `organizationId: null`. That is the test whose job
is to stop the two readers drifting apart.

## Debugging tips

- A 401 from a test usually means login failed, not that scope is wrong; log
  `response.status` and body before asserting on the dashboard.
- Thrown service errors are classified by **message text**
  (`errors.ts:28-34`): "not found" -> 404; "forbidden", "does not belong",
  "cannot" or "only the" -> 403; anything else -> 500. If a status surprises
  you, read the error message first. 06 shows where this misfires.
- If a test flakes on a slow machine with a timeout on the first request,
  that is the TypeScript transform warming up; the recorded run used
  `--testTimeout=30000` (see VERIFICATION).
