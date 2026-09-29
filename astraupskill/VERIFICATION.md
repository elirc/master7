# Verification: tenant-scoped dashboard audit logs

> **Update (follow-up pass).** The course now ships four extra tests in `apps/api/src/audit-scope.test.ts`, and the
> suite passes **23 tests in four files**. The raw log for that run is [evidence/tests-root-02.log](evidence/tests-root-02.log)
> (`Test Files 4 passed (4)` / `Tests 23 passed (23)`), and `npm run typecheck` was clean in the same pass.
> Everything below describes the original 19-test delivery run, whose log is still in `evidence/tests-root-01.log`;
> both numbers are real and neither replaces the other.

The reviewed change passed **19 tests in three files**, TypeScript checking, and the complete workspace build. The tests comprise eleven API tests, four policy tests and four domain tests. The newly added dashboard regression uses the actual local Express application and HTTP requests with synthetic seeded identities. This is stronger evidence than testing the new filter helper alone: removing the dashboard's call to the helper makes the organization isolation assertion fail against the two-organization fixture.

## Reproduce from the project root

Use Node 22.16 and npm 10.9.2, the versions used for this run, or verify compatibility separately when changing runtimes. The root lockfile and normal install were used; lifecycle scripts were enabled. The following commands use the package scripts already present in the project. They do not require a running PostgreSQL server.

```powershell
npm ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'Installation failed' }
npm test -- --pool=threads --poolOptions.threads.singleThread=true --testTimeout=30000
if ($LASTEXITCODE -ne 0) { throw 'Tests failed' }
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'Type checking failed' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
```

The test options match this project's Vitest 2 runner. Do not copy version-specific runner flags into unrelated projects without checking their installed version. The application build runs the workspace scripts for the API, web application and shared packages. This project uses Vite for its web build; invoking a Next.js executable here is not a valid verification command.

## What was observed

The [test output](evidence/tests-root-01.log) records nineteen passing tests, and the [test process record](evidence/tests-root-01.json) records exit code zero and the command's working directory. [Typecheck output](evidence/typecheck-root-01.log) and its [process record](evidence/typecheck-root-01.json), plus [build output](evidence/build-root-01.log) and its [process record](evidence/build-root-01.json), retain the other successful checks. [Installation evidence](evidence/install-01.json) records the earlier successful normal dependency install. [Source hashes](evidence/root-final-source-hashes.json) were compared after the checks; the reviewed executable files stayed unchanged while these commands ran.

The dashboard regression signs in synthetic Acme staff, a platform administrator and a learner. The staff response must contain only Acme audit records, the platform response must include both seeded organizations, and the learner response must contain an empty audit list. The existing audit endpoint retains its own learner restriction and organization filtering. Filtering occurs before taking the first 25 records, so another organization's entries cannot consume the current organization's dashboard limit.

## Limits and the next useful test

The runtime uses the existing in-memory `store`. The Prisma schema elsewhere in the repository does not make these HTTP tests persistent-database integration tests. They establish response selection for the tested actors and fixtures, not row-level database security or behavior after a server restart. This patch does not redesign authentication, course-version submission validation, or the broader enrollment workflow. Synthetic demo credentials are teaching fixtures, not deployment credentials.

The focused source review confirmed that the policy is called by the dashboard service. A useful next exercise is to add more than 25 interleaved audit records for two organizations, then assert both the result limit and organization ownership. Another is to test every operational role explicitly using the same organization policy. These are proposed exercises; they are not included in the recorded nineteen-test count. Keep browser accessibility, a persistent adapter, concurrent writes and production deployment as separate verification scopes. A passing build is not evidence that those paths have been exercised.

An earlier ad hoc attempt invoked a missing Next executable and failed. Its raw output remains in the central history; the successful build recorded here uses the actual root `npm run build` script. Reading the exact command and exit status prevents a setup error from being mistaken for an application defect or silently counted as a pass.

## Reproducing on macOS or Linux

The PowerShell block above is Windows-specific only in its error handling. The same run on macOS or Linux:

```bash
npm ci --no-audit --no-fund
npm test -- --pool=threads --poolOptions.threads.singleThread=true --testTimeout=30000
npm run typecheck
npm run build
```

`set -e` at the top of a script gives you the `if ($LASTEXITCODE -ne 0) { throw }` behaviour. The
`--testTimeout=30000` flag is not cosmetic on a slow machine: with the default 5 s timeout the first test can
fail purely because the TypeScript transform of the workspace has not finished warming up. That is a runner
timeout, not an application defect - read the failure message before you go looking for a bug.

Node 22.16 and npm 10.9.2 were used for both recorded runs. There is no database, so no Postgres port, Docker
image or migration is involved anywhere in this course.

## What the follow-up run added

The follow-up pass made three changes and re-verified them:

1. `auditLogScope(actor)` is exported from `apps/api/src/services.ts` and is now the single implementation of
   the scope rule used by both the dashboard projection and `services.auditLogs`.
2. `resetStore()` and `seedAuditLogs(count, organizationId, options?)` are exported from
   `apps/api/src/store.ts` so the practice fixtures are buildable without hand-editing the store.
3. `apps/api/src/audit-scope.test.ts` adds four tests: dashboard/endpoint agreement, filter-before-limit with a
   26-Nova/1-Acme fixture, the actor's organization on a `course.created` audit row, and a 403 with no audit row
   when an instructor names another organization in the request body.

The root `README.md` entry that pointed at `docs/code-walkthroughs/audit-log-scope/README.md` was wrong - that
directory has never existed - and now points at `astraupskill/README.md`.

Limits are unchanged: this is still an in-memory store, still no Prisma client at runtime, and still no
browser or deployment evidence.
