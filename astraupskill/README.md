# Master7: protect audit data in every response

When an organization administrator opens the dashboard, whose audit records
may appear in its JSON? Master7's dedicated `GET /audit-logs` endpoint was
already organization-scoped, but `GET /me/dashboard` built a second projection
from the newest *global* records. This course follows the fix that applies the
same scope to that second read path, then uses the same habit (trace every
reader and writer of a table) to find what is still open.

The application is an enterprise LMS: organizations, courses, versions,
enrollments, progress, quizzes, assignments, certificates and audit logs. The
root npm workspace holds an Express 4 API (`apps/api`), a React/Vite client
(`apps/web`), a demo worker (`apps/worker`) and shared packages
(`packages/domain`, `contracts`, `config`, `database`). **At runtime the API
reads and writes a plain in-memory object** (`apps/api/src/store.ts`). A Prisma
schema exists in `packages/database/prisma/schema.prisma` and
`packages/database/src/index.ts` creates a `PrismaClient`, but no API file
imports it. Keeping that distinction clear is part of assessing a codebase
accurately.

## Chapters

1. [Codebase map](01-CODEBASE-MAP.md): login -> actor -> dashboard -> JSON, with line numbers.
2. [Concepts](02-CONCEPTS.md): authentication vs organization scope, filter-before-limit, one predicate for two readers.
3. [Worked change](03-WORKED-CHANGE.md): the exact diff against the snapshot.
4. [Testing and debugging](04-TESTING-AND-DEBUGGING.md): the Vitest HTTP regressions and a break-it drill.
5. [Practice](05-PRACTICE.md): six Goal + **Check** exercises that run with plain `node --test`, no install.
6. [Solutions and review](06-SOLUTIONS-AND-REVIEW.md): answers, then open findings with file:line evidence.
7. [Trace lab](07-TRACE-LAB.md): every hop from token to returned array.
8. [Verification](VERIFICATION.md): what was run, what the evidence files really contain, and the limits.

`snapshots/services-before.ts.txt`, `store-before.ts.txt` and
`api-tests-before.ts.txt` are the exact pre-change files (the `.txt` suffix
keeps them out of compilation). 05 loads `services-before.ts.txt` directly so
you can measure the original leak instead of taking it on trust.

## Before you start

You need to read TypeScript, run `npm` scripts, and read JSON. You do **not**
need Prisma, Docker, SQL or React. If JSON Web Tokens are new: `POST
/auth/login` returns a signed string, and `requireAuth` turns it back into an
`Actor` on each request.

| Chapter | Budget | What you produce |
| --- | --- | --- |
| 01-03 | 1.5 h | A sketch of the request path and the before/after delta |
| 04 | 45 min | A red test you caused on purpose, then green again |
| 05 | 90 min | Six passing checks plus written predictions |
| 06-07 | 1 h | Your predictions compared with the answers; one finding you would fix first |

## Glossary

- **Actor**: `{ id, role, organizationId }` (`packages/domain/src/index.ts:9-13`), built in `apps/api/src/auth.ts:24`.
- **Tenant / organization**: one customer's data boundary; the seed has `org-acme` and `org-nova`.
- **Projection**: the subset and shape of stored data one endpoint returns. The dashboard and `/audit-logs` are two projections of `store.auditLogs`.
- **Scope predicate**: "may this actor see this row?" - here `auditLogScope(actor)` (`apps/api/src/services.ts:28-30`).
- **Audit log**: a record of who did what to which resource, written by `audit(...)` (`apps/api/src/store.ts:179-181`).
- **Filter-before-limit**: apply the scope predicate before `slice(0, 25)`, so another tenant's rows cannot use up the page.
- **Id oracle**: a response difference (for example 404 vs 403) that tells a caller whether an id they may not see exists.
