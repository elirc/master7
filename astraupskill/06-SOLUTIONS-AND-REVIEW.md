# 06. Solutions and review

This chapter answers the five exercises in 05-PRACTICE.md with source-grounded
requests and assertions. The active test helpers are in
apps/api/src/api.test.ts. The request helper creates the real Express app,
listens on an ephemeral port, calls fetch, and closes the server:

~~~ts
async function request(path: string, init?: RequestInit) {
  const app = createApp();
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  try {
    return await fetch("http://127.0.0.1:" + port + path, init);
  } finally {
    server.close();
  }
}
~~~

Place these examples in `apps/api/src/api.test.ts`, reusing its existing
imports and `request` helper. Add the store import for the ordering exercise:

~~~ts
import { describe, expect, it } from "vitest";
import { createApp } from "./index.js";
import { store } from "./store.js";
~~~

The seeded password is password123. The dashboard endpoint is
GET /me/dashboard, and login is POST /auth/login with JSON credentials. A
small reusable login helper makes each answer executable:

~~~ts
async function tokenFor(email: string) {
  const response = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password123" }),
  });
  expect(response.status).toBe(200);
  return (await response.json() as { token: string }).token;
}

async function dashboardFor(email: string) {
  const token = await tokenFor(email);
  const response = await request("/me/dashboard", {
    headers: { Authorization: "Bearer " + token },
  });
  expect(response.status).toBe(200);
  return await response.json() as {
    auditLogs: { organizationId: string | null; targetId: string }[];
    courses: unknown[];
  };
}
~~~

Exercise 1 asks for an Acme staff response. The concrete existing regression
uses admin@acme.test, which has ORG_ADMIN role and organizationId org-acme:

~~~ts
it("keeps Acme dashboard logs in Acme", async () => {
  const result = await dashboardFor("admin@acme.test");
  expect(result.courses.length).toBeGreaterThan(0);
  expect(result.auditLogs.length).toBeGreaterThan(0);
  expect(result.auditLogs.every((log) => log.organizationId === "org-acme")).toBe(true);
  expect(result.auditLogs.map((log) => log.targetId))
    .not.toContain("version-forklift-v1");
});
~~~

The answer is the Acme seeded target, version-security-v1, and no Nova target.
An instructor has the same organization policy in services.ts, but this exact
regression uses the seeded admin. An instructor example can be added with
dashboardFor("instructor@acme.test"); it should receive the same organization
scope, though that role is not the assertion reported by the current suite.

Exercise 2 asks why a platform administrator sees both organizations. The
answer is the explicit PLATFORM_ADMIN branch in visibleAuditLogs. The
existing HTTP assertion uses the real seeded platform identity:

~~~ts
it("keeps platform dashboard visibility global", async () => {
  const result = await dashboardFor("platform@lms.test");
  expect(result.auditLogs.map((log) => log.targetId))
    .toEqual(expect.arrayContaining(["version-security-v1", "version-forklift-v1"]));
});
~~~

This is a deliberate exception. Do not “fix” the leak by filtering every
actor against one organization; that would break platform operations.

Exercise 3 asks for the learner shape. The exact answer is an HTTP 200 JSON
dashboard whose auditLogs property is an empty array, even though the store
contains events:

~~~ts
it("returns an empty audit projection to learners", async () => {
  const result = await dashboardFor("learner@acme.test");
  expect(result.auditLogs).toEqual([]);
});
~~~

The dedicated GET /audit-logs endpoint remains separately forbidden for a
learner. The dashboard contract is an empty projection, so these are two
different tested response behaviors.

Exercise 4 is a proposed ordering test, not part of the recorded nineteen
tests. It asks whether a local event survives twenty-six foreign events.
Because apps/api/src/store.ts exports the in-memory store, a focused test can
save the original array, prepend synthetic Nova records, call the same
dashboard request, and restore it in a finally block:

~~~ts
it("filters organization records before limiting the dashboard", async () => {
const original = store.auditLogs.slice();
try {
  for (let index = 0; index < 26; index += 1) {
    store.auditLogs.unshift({
      id: "nova-" + index,
      organizationId: "org-nova",
      actorId: "user-platform",
      action: "course.published",
      targetType: "CourseVersion",
      targetId: "nova-" + index,
      metadata: { exercise: "limit-order" },
      createdAt: new Date(index).toISOString(),
    });
  }
  const result = await dashboardFor("admin@acme.test");
  expect(result.auditLogs.length).toBeGreaterThan(0);
  expect(result.auditLogs.map((log) => log.targetId)).toContain("version-security-v1");
  expect(result.auditLogs.every((log) => log.organizationId === "org-acme")).toBe(true);
} finally {
  store.auditLogs.splice(0, store.auditLogs.length, ...original);
}
});
~~~

The expected result is the Acme event, because the staff branch filters by
organizationId before slice(0, 25). This proposed test must restore the
singleton; otherwise later tests inherit its records. It is an additional
exercise, not evidence included in the nineteen-test result.
The explicit nonempty and local-target assertions are essential: an empty
array passes `every`, so ownership alone would not catch slicing the first
twenty-five foreign records before filtering. The `it` callback also keeps
the asynchronous request inside a registered test rather than executing it
while the suite is being defined.

Exercise 5 asks for agreement with the dedicated endpoint. Both paths should
use organizationId for ordinary staff, while platform administrators retain
global visibility and learners have the documented dashboard empty result.
The dedicated endpoint additionally supports action, targetType, page and
pageSize filters. The dashboard is a fixed first page. Review the code rather
than assuming identical JSON shapes: services.auditLogs returns
{ auditLogs, pagination }, while services.dashboard returns auditLogs as one
field of a larger snapshot.

The full policy matrix is:

| Actor and seeded identity | Dashboard audit result |
| --- | --- |
| Acme ORG_ADMIN admin@acme.test | Acme records only |
| Acme INSTRUCTOR instructor@acme.test | Acme records only; role inferred from the same organization branch |
| PLATFORM_ADMIN platform@lms.test | Acme and Nova records |
| Acme LEARNER learner@acme.test | [] |

The repair is complete when the ordinary branch applies
filter(log.organizationId === actor.organizationId) before slice, the platform
branch remains global, and the learner branch remains empty. The source
snapshot services-before.ts.txt shows the former global expression. The actual
API test invokes login and /me/dashboard, so it would fail against that
expression when both seeded records occupy the first page. The test proves
local in-memory response selection and JWT wiring; it does not prove
row-level security in a persistent database, production identity assurance,
browser rendering, or external audit delivery.

## Exercise 4, as the shipped test states it

The assertion is not "the dashboard hides Nova rows"; it is that two endpoints return the same row IDs for the same actor, checked for a tenant admin and for the platform admin. From `apps/api/src/audit-scope.test.ts:31-42`:

```ts
  it("returns the same audit rows on the dashboard and on /audit-logs for the same actor", async () => {
    for (const email of ["admin@acme.test", "platform@lms.test"]) {
      const token = await login(email);
      const dashboard = await request("/me/dashboard", { headers: { Authorization: `Bearer ${token}` } });
      const dashboardBody = await dashboard.json() as { auditLogs: AuditRow[] };
      const endpoint = await request("/audit-logs?page=1&pageSize=25", { headers: { Authorization: `Bearer ${token}` } });
      const endpointBody = await endpoint.json() as { auditLogs: AuditRow[] };
      expect(dashboard.status).toBe(200);
      expect(endpoint.status).toBe(200);
      expect(dashboardBody.auditLogs.map((log) => log.id)).toEqual(endpointBody.auditLogs.map((log) => log.id));
    }
  });
```

## Exercise 4, answered against the shipped test

Exercise 4 is no longer "proposed": it is the second test in `apps/api/src/audit-scope.test.ts` and it is part
of the recorded 22-test run.

~~~ts
it("filters by owner before applying the page limit, so a noisy tenant cannot push an owner's row off page one", async () => {
  resetStore();
  store.auditLogs.length = 0;
  seedAuditLogs(1, "org-acme");
  seedAuditLogs(26, "org-nova");

  const token = await login("admin@acme.test");
  const dashboard = await request("/me/dashboard", { headers: { Authorization: `Bearer ${token}` } });
  const body = await dashboard.json() as { auditLogs: AuditRow[] };
  expect(body.auditLogs).toHaveLength(1);
  expect(body.auditLogs[0]!.organizationId).toBe("org-acme");

  const platformToken = await login("platform@lms.test");
  const platformDashboard = await request("/me/dashboard", { headers: { Authorization: `Bearer ${platformToken}` } });
  const platformBody = await platformDashboard.json() as { auditLogs: AuditRow[] };
  expect(platformBody.auditLogs).toHaveLength(25);
});
~~~

**Answers.** The Acme admin gets exactly **1** row. The platform admin gets exactly **25** - the limit, out of
27 stored rows - because the platform branch of `auditLogScope` admits everything and only then does
`slice(0, 25)` apply. Under the old, unscoped code the Acme admin would have received 25 Nova rows and zero of
their own, which is both a leak and a loss. `resetStore()` in `afterEach` puts the seeded fixture back, so no
later test inherits the 27 synthetic rows.

## Exercise 5, answered: one predicate, one test

The agreement is now enforced rather than assumed:

~~~ts
it("returns the same audit rows on the dashboard and on /audit-logs for the same actor", async () => {
  for (const email of ["admin@acme.test", "platform@lms.test"]) {
    const token = await login(email);
    const dashboard = await request("/me/dashboard", { headers: { Authorization: `Bearer ${token}` } });
    const endpoint = await request("/audit-logs?page=1&pageSize=25", { headers: { Authorization: `Bearer ${token}` } });
    expect(((await dashboard.json()) as any).auditLogs.map((l: AuditRow) => l.id))
      .toEqual(((await endpoint.json()) as any).auditLogs.map((l: AuditRow) => l.id));
  }
});
~~~

The shapes still differ (`{ auditLogs, pagination }` versus `auditLogs` inside a larger snapshot) and the
learner rule still differs (403 versus `[]`), so the test compares the **row ids**, which is the part that must
never diverge. The reviewer's expectation, stated precisely: *the ownership predicate is one exported function
that both readers call, and a test fails if either reader stops calling it.*

## Exercise 6, answered: what actually turns red

Putting the unscoped `slice(0, 25)` back and running
`npx vitest run apps/api/src/api.test.ts apps/api/src/audit-scope.test.ts` turns these red:

- `api.test.ts > scopes dashboard audit logs by organization while platform admins see both tenants` - on
  `expect(adminResult.auditLogs.every((log) => log.organizationId === "org-acme")).toBe(true)`, because the
  Nova seeded row is now in the Acme admin's list.
- `audit-scope.test.ts > filters by owner before applying the page limit...` - the Acme admin receives 25 rows
  (all Nova) instead of 1.
- `audit-scope.test.ts > returns the same audit rows on the dashboard and on /audit-logs...` - the dashboard
  now returns global rows while `/audit-logs` is still scoped, so the id lists differ.

The learner assertion stays green: the `LEARNER` early return is untouched by that edit. If your prediction
missed that, the lesson is that a single expression change usually breaks a *subset* of the tests, and the
subset tells you exactly which contract the expression owned.

## Exercise 7, answered: the actor wins, and a policy enforces it

The audit row carries `org-acme` because `services.createCourse` calls
`audit(actor.id, organizationId, "course.created", ...)` with the organization it just authorized - and the
authorization is `assertCanAuthorCourse(actor, organizationId)` (`apps/api/src/policies.ts:10`), which delegates
to `canAuthorCourse` (`packages/domain/src/index.ts:19`):

~~~ts
return actor.role === "PLATFORM_ADMIN"
  || ((actor.role === "INSTRUCTOR" || actor.role === "ORG_ADMIN") && actor.organizationId === organizationId);
~~~

So a body-supplied organization id is *checked against the actor* before anything is written; an Acme
instructor sending `organizationId: "org-nova"` gets a `ForbiddenError` and no course and no audit row. The
general rule: a request body may *name* a tenant, but the tenant must be re-derived from, or validated against,
the authenticated actor before any write. The shipped test then closes the loop by showing the row is readable
by the Acme admin and excluded by `auditLogScope` for a Nova admin - the writer and the reader use the same
boundary.

A test for the rejected case is a good five-minute follow-on:

~~~ts
it("refuses to write an audit row for another organization", async () => {
  const token = await login("instructor@acme.test");
  const response = await request("/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ organizationId: "org-nova", title: "Cross tenant", summary: "Should not be created." })
  });
  expect(response.status).toBe(403);
  expect(store.auditLogs.some((log) => log.action === "course.created" && log.organizationId === "org-nova")).toBe(false);
});
~~~
