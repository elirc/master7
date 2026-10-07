# 05. Practice: predict, then check

Every exercise has a **Goal**, a prediction to write down first, and a
**Check** you run. The checks import the real TypeScript sources with Node's
built-in type stripping, so they need **no `npm install`** - only Node 22.16
or newer (they were verified on 22.16.0).

## Setup (once)

Make a scratch folder **outside** the repo (for example `../m7-practice/`)
and save this loader there as `lms-loader.mjs`. It teaches Node three things
the workspace normally gets from `npm install` and `tsc`: where `@lms/domain`
lives, that `./store.js` means `./store.ts`, and how to load the `.ts.txt`
snapshots as TypeScript.

```js
// lms-loader.mjs - dependency-free loader so `node --test` can import this workspace's TypeScript.
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
const root = pathToFileURL(process.cwd() + '/').href;
const hooks = `
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = ${JSON.stringify(root)};
export async function resolve(specifier, context, next) {
  if (specifier === '@lms/domain') return { url: root + 'packages/domain/src/index.ts', shortCircuit: true };
  if (specifier.startsWith('.') && context.parentURL) {
    const base = context.parentURL.endsWith('.ts.txt') ? root + 'apps/api/src/x' : context.parentURL;
    const ts = new URL(specifier.replace(/\\.js$/, '.ts'), base);
    if (existsSync(fileURLToPath(ts))) return { url: ts.href, shortCircuit: true };
  }
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url.endsWith('.ts.txt')) return { format: 'module-typescript', source: readFileSync(fileURLToPath(url), 'utf8'), shortCircuit: true };
  return next(url, context);
}`;
register('data:text/javascript,' + encodeURIComponent(hooks));
```

Run every check **from the repo root**:

```
node --experimental-transform-types --test ../m7-practice/<file>.test.mjs
```

(`--experimental-transform-types` rather than `--experimental-strip-types`
because `errors.ts` uses constructor parameter properties.) Because the
snapshot's relative imports resolve to `apps/api/src/`, the original and
current services share one `store` module - which is what lets a single test
compare them.

## Exercise 1 - The dashboard matrix

**Goal:** know the dashboard audit projection for every role on the seeded
store. Predict the `targetId` list for the Acme admin, the Acme instructor,
the platform admin and the Acme learner.

Save as `ex1-dashboard-matrix.test.mjs`:

```js
import './lms-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const src = (p) => import(pathToFileURL(process.cwd() + '/' + p).href);
const { services } = await src('apps/api/src/services.ts');
const { resetStore } = await src('apps/api/src/store.ts');

const actor = (id, role, organizationId) => ({ id, role, organizationId });
const targets = (a) => services.dashboard(a).auditLogs.map((log) => log.targetId);

test('dashboard audit projection per actor on the seeded store', () => {
  resetStore();
  assert.deepEqual(targets(actor('user-admin', 'ORG_ADMIN', 'org-acme')), ['version-security-v1']);
  assert.deepEqual(targets(actor('user-instructor', 'INSTRUCTOR', 'org-acme')), ['version-security-v1']);
  assert.deepEqual(targets(actor('user-platform', 'PLATFORM_ADMIN', null)), ['version-security-v1', 'version-forklift-v1']);
  assert.deepEqual(targets(actor('user-learner', 'LEARNER', 'org-acme')), []);
});
```

**Check:** `# pass 1`. The instructor row is not covered by the Vitest suite
(it only logs in the admin); this check is the evidence for it.

## Exercise 2 - Filter before limit, measured on both versions

**Goal:** with 26 Nova rows in front of 1 Acme row, predict how many rows and
which organizations the Acme admin gets from the current code and from the
original snapshot, and how many the platform admin gets.

Save as `ex2-filter-before-limit.test.mjs`:

```js
import './lms-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const src = (p) => import(pathToFileURL(process.cwd() + '/' + p).href);
const current = await src('apps/api/src/services.ts');
const original = await src('astraupskill/snapshots/services-before.ts.txt'); // shares the same store module
const { store, resetStore, seedAuditLogs } = await src('apps/api/src/store.ts');

const acmeAdmin = { id: 'user-admin', role: 'ORG_ADMIN', organizationId: 'org-acme' };
const platform = { id: 'user-platform', role: 'PLATFORM_ADMIN', organizationId: null };

test('26 Nova rows in front of 1 Acme row', () => {
  resetStore();
  store.auditLogs.length = 0;
  seedAuditLogs(1, 'org-acme');
  seedAuditLogs(26, 'org-nova');
  const orgs = (logs) => [...new Set(logs.map((log) => log.organizationId))];

  assert.equal(current.services.dashboard(acmeAdmin).auditLogs.length, 1);
  assert.deepEqual(orgs(current.services.dashboard(acmeAdmin).auditLogs), ['org-acme']);
  assert.equal(current.services.dashboard(platform).auditLogs.length, 25);

  const leaked = original.services.dashboard(acmeAdmin).auditLogs;
  assert.equal(leaked.length, 25);
  assert.deepEqual(orgs(leaked), ['org-nova']); // a leak AND a loss: zero Acme rows
});
```

**Check:** `# pass 1`. Explain in one sentence why the original code returns
no Acme row at all.

## Exercise 3 - Would an agreement test have caught the bug?

**Goal:** show that "both readers return the same ids" holds today and fails
on the original code, without editing `src/`.

Save as `ex3-agreement.test.mjs`:

```js
import './lms-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const src = (p) => import(pathToFileURL(process.cwd() + '/' + p).href);
const current = await src('apps/api/src/services.ts');
const original = await src('astraupskill/snapshots/services-before.ts.txt');
const { resetStore } = await src('apps/api/src/store.ts');

const acmeAdmin = { id: 'user-admin', role: 'ORG_ADMIN', organizationId: 'org-acme' };
const ids = (svc) => ({
  dashboard: svc.dashboard(acmeAdmin).auditLogs.map((log) => log.id),
  endpoint: svc.auditLogs(acmeAdmin, { page: 1, pageSize: 25 }).auditLogs.map((log) => log.id),
});

test('current code: both readers return the same rows', () => {
  resetStore();
  const { dashboard, endpoint } = ids(current.services);
  assert.deepEqual(dashboard, endpoint);
});

test('original code: the readers disagree, so an agreement test would have caught the bug', () => {
  resetStore();
  const { dashboard, endpoint } = ids(original.services);
  assert.notDeepEqual(dashboard, endpoint);
  assert.deepEqual(endpoint, ['audit-seeded-acme']);
});
```

**Check:** `# pass 2`. Then answer: which of the four `audit-scope.test.ts`
tests is this the service-level twin of?

## Exercise 4 - Who stamps the organization on an audit row?

**Goal:** predict the `organizationId` on the audit row when a platform admin
(a) marks an Acme learner's lesson complete and (b) creates a course for
`org-acme`, and whether the Acme admin can see each row. Read
`services.ts:186` and `:150` first.

Save as `ex4-audit-write-org.test.mjs`:

```js
import './lms-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const src = (p) => import(pathToFileURL(process.cwd() + '/' + p).href);
const { services } = await src('apps/api/src/services.ts');
const { store, resetStore } = await src('apps/api/src/store.ts');

const acmeAdmin = { id: 'user-admin', role: 'ORG_ADMIN', organizationId: 'org-acme' };
const platform = { id: 'user-platform', role: 'PLATFORM_ADMIN', organizationId: null };
const acmeView = () => services.auditLogs(acmeAdmin, { page: 1, pageSize: 100 }).auditLogs.map((log) => log.id);

test('a platform admin completing an Acme learner lesson writes an audit row Acme cannot see', () => {
  resetStore();
  services.completeLesson(platform, 'enroll-security-lena', 'lesson-data');
  const row = store.auditLogs.find((log) => log.action === 'lesson.completed');
  assert.equal(row.organizationId, null); // actor's org, not the enrollment's org
  assert.ok(!acmeView().includes(row.id));
});

test('createCourse stamps the authorized body org, so the same admin action stays visible', () => {
  resetStore();
  const course = services.createCourse(platform, 'org-acme', 'Incident Drill', 'Practice reporting phishing.');
  const row = store.auditLogs.find((log) => log.targetId === course.id);
  assert.equal(row.organizationId, 'org-acme');
  assert.ok(acmeView().includes(row.id));
});
```

**Check:** `# pass 2`. Write the one-line fix for `completeLesson` (hint: the
course is already reachable through `enrollmentContext`).

## Exercise 5 - Status codes chosen by message text

**Goal:** `toAppError` (`errors.ts:28-34`) maps errors by regex on the
message. Predict the HTTP status for: publishing an already-published course;
completing a lesson from another course version; an Acme instructor
publishing Nova's `course-forklift`; the same instructor publishing a course
id that does not exist.

Save as `ex5-error-mapping.test.mjs`:

```js
import './lms-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const src = (p) => import(pathToFileURL(process.cwd() + '/' + p).href);
const { services } = await src('apps/api/src/services.ts');
const { resetStore } = await src('apps/api/src/store.ts');
const { toAppError } = await src('apps/api/src/errors.ts');

const status = (fn) => { try { fn(); return 'no error'; } catch (error) { return toAppError(error).statusCode; } };
const acmeInstructor = { id: 'user-instructor', role: 'INSTRUCTOR', organizationId: 'org-acme' };
const lena = { id: 'user-learner', role: 'LEARNER', organizationId: 'org-acme' };

test('message-regex mapping turns state and validation errors into 403', () => {
  resetStore();
  // "Cannot publish course draft from PUBLISHED" matches /cannot/i
  assert.equal(status(() => services.publishCourse(acmeInstructor, 'course-security')), 403);
  // "Lesson does not belong to this enrollment version" matches /does not belong/i
  assert.equal(status(() => services.completeLesson(lena, 'enroll-security-lena', 'lesson-inspection')), 403);
});

test('existence is checked before authorization: 404 vs 403 reveals another tenant course id', () => {
  resetStore();
  assert.equal(status(() => services.publishCourse(acmeInstructor, 'course-forklift')), 403); // exists, Nova
  assert.equal(status(() => services.publishCourse(acmeInstructor, 'course-does-not-exist')), 404);
});
```

**Check:** `# pass 2`. Name the status each of the first two cases *should*
return and why (answer in 06).

## Exercise 6 - Repeating a certificate request

**Goal:** predict what two consecutive `POST
/enrollments/enroll-security-lena/certificates` calls by Lena do to
`store.certificates` (the seed already holds one certificate for her).

Save as `ex6-certificate-repeat.test.mjs`:

```js
import './lms-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const src = (p) => import(pathToFileURL(process.cwd() + '/' + p).href);
const { services } = await src('apps/api/src/services.ts');
const { store, resetStore } = await src('apps/api/src/store.ts');

const lena = { id: 'user-learner', role: 'LEARNER', organizationId: 'org-acme' };

test('each certificate request appends a new ISSUED certificate', () => {
  resetStore();
  const first = services.issueCertificate(lena, 'enroll-security-lena');
  const second = services.issueCertificate(lena, 'enroll-security-lena');
  assert.equal(first.status, 'ISSUED');
  assert.notEqual(first.verificationId, second.verificationId);
  assert.equal(store.certificates.filter((c) => c.enrollmentId === 'enroll-security-lena').length, 3); // seed + 2
});
```

**Check:** `# pass 1`. Then sketch the guard you would add and the test that
proves a second call returns the existing certificate.
