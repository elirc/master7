# Verification: tenant-scoped dashboard audit logs

There were two passes over this change. Keep their evidence separate.

## Pass 1 - the original delivery (2026-09-12)

The original repair inlined the scope rule in a dashboard helper and added the
dashboard regression to `api.test.ts`. At that point the suite had **19 tests
in three files** (11 API, 4 policy, 4 domain), and `npm test`, `npm run
typecheck` and `npm run build` all exited 0.

What `evidence/` actually holds for that pass is **process records only**:
`install-01.json`, `tests-root-01.json`, `typecheck-root-01.json` and
`build-root-01.json` each record the command, start/finish time, exit code 0
and `passed: true`. Their `log` fields name `.log` files that were **not
committed**, so the test *count* is not recorded in the repository; the JSON
proves only that the commands succeeded. The `cwd` and npm-cache paths inside
them point at the authoring machine's staging folder - treat these files as
frozen historical records, not as paths to reproduce.

`root-final-source-hashes.json` lists SHA-256 hashes for 43 source files at
the end of pass 1. Checked on 2026-10-06 against the current tree: 41 still
match; `apps/api/src/services.ts` and `apps/api/src/store.ts` differ, and
`apps/api/src/audit-scope.test.ts` is absent from the list - all three were
changed or added by pass 2.

## Pass 2 - the follow-up

Pass 2 made three changes:

1. Exported `auditLogScope(actor)` from `services.ts` and made both
   `visibleAuditLogs` and `services.auditLogs` call it.
2. Added `resetStore()` and `seedAuditLogs(...)` to `store.ts`.
3. Added `apps/api/src/audit-scope.test.ts` (4 tests: agreement,
   filter-before-limit, write-path organization, cross-tenant write refused).

Counting `it(` calls in the current tree gives **23 tests in 4 files**
(11 + 4 + 4 + 4). No evidence file for a pass-2 run is committed, so
reproduce it yourself (below) rather than relying on a recorded number.

## Reproduce

Use Node 22.16 and npm 10.9 (the versions of the recorded runs). No database,
Docker or Postgres is involved; the API runs on the in-memory store.

```bash
npm ci --no-audit --no-fund
npm test -- --pool=threads --poolOptions.threads.singleThread=true --testTimeout=30000
npm run typecheck
npm run build
```

Expect `Test Files 4 passed (4)` and `Tests 23 passed (23)`. The 30 s timeout
is not cosmetic: on a slow machine the first request can exceed Vitest's 5 s
default while the TypeScript transform warms up - a runner timeout, not an
application defect. `npm run verify` runs `db:validate`, `typecheck`, `test`
and `build` in order and stops at the first failure.

Without installing anything, the six 05 checks run the real services against
the real store and the original snapshot:
`node --experimental-transform-types --test <scratch>/ex*.test.mjs` from the
repo root. On 2026-10-06 they reported `# tests 9`, `# pass 9`, `# fail 0` on
Node 22.16.0.

## Limits

- The runtime store is in memory. The Prisma schema and
  `packages/database` are not used by the API, so none of this is evidence of
  database row-level security or of behavior after a restart.
- The HTTP tests cover the seeded admin, platform admin and learner; the
  instructor case is covered only by 05 Exercise 1.
- Nothing here exercises the browser, a deployment, or concurrent writers.
- The open findings in 06 (audit writer tenant, regex error mapping, id
  oracle, non-idempotent certificates, plaintext passwords/default JWT
  secret, duplicate enrollments) are unaffected by this change.
