import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./index.js";
import { auditLogScope } from "./services.js";
import { resetStore, seedAuditLogs, store } from "./store.js";

async function request(path: string, init?: RequestInit) {
  const app = createApp();
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  try {
    return await fetch(`http://127.0.0.1:${port}${path}`, init);
  } finally {
    server.close();
  }
}

async function login(email: string) {
  const response = await request("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "password123" }) });
  const body = await response.json() as { token: string };
  return body.token;
}

interface AuditRow { id: string; organizationId: string | null; targetId: string }

afterEach(() => {
  resetStore();
});

describe("audit log scope", () => {
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

  it("filters by owner before applying the page limit, so a noisy tenant cannot push an owner's row off page one", async () => {
    resetStore();
    store.auditLogs.length = 0;
    seedAuditLogs(1, "org-acme", { action: "course.published", targetType: "CourseVersion" });
    seedAuditLogs(26, "org-nova", { action: "course.published", targetType: "CourseVersion" });

    const token = await login("admin@acme.test");
    const dashboard = await request("/me/dashboard", { headers: { Authorization: `Bearer ${token}` } });
    const body = await dashboard.json() as { auditLogs: AuditRow[] };
    expect(dashboard.status).toBe(200);
    expect(body.auditLogs).toHaveLength(1);
    expect(body.auditLogs[0]!.organizationId).toBe("org-acme");

    const platformToken = await login("platform@lms.test");
    const platformDashboard = await request("/me/dashboard", { headers: { Authorization: `Bearer ${platformToken}` } });
    const platformBody = await platformDashboard.json() as { auditLogs: AuditRow[] };
    expect(platformBody.auditLogs).toHaveLength(25);
  });

  it("writes the actor's organization onto the audit row a course creation emits", async () => {
    const token = await login("instructor@acme.test");
    const created = await request("/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ organizationId: "org-acme", title: "Incident Drill", summary: "Practice reporting a suspected phishing attempt." })
    });
    expect(created.status).toBe(201);
    const course = await created.json() as { id: string; organizationId: string };
    const row = store.auditLogs.find((log) => log.action === "course.created" && log.targetId === course.id);
    expect(row).toBeDefined();
    expect(row!.organizationId).toBe("org-acme");

    // The writer and the reader agree: the row this actor just wrote is visible to their own tenant admin
    // and invisible to the other tenant's admin.
    const acmeAdmin = await login("admin@acme.test");
    const acmeView = await request("/audit-logs?page=1&pageSize=25", { headers: { Authorization: `Bearer ${acmeAdmin}` } });
    const acmeBody = await acmeView.json() as { auditLogs: AuditRow[] };
    expect(acmeBody.auditLogs.map((log) => log.targetId)).toContain(course.id);

    const novaAdmin = { id: "user-nova-admin", organizationId: "org-nova", email: "admin@nova.test", name: "Nora Nova", role: "ORG_ADMIN" as const };
    expect(store.auditLogs.filter(auditLogScope(novaAdmin)).map((log) => log.targetId)).not.toContain(course.id);
  });

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
});
