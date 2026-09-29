import { describe, expect, it } from "vitest";
import { createApp } from "./index.js";

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

describe("api", () => {
  it("logs in seeded learner and returns dashboard", async () => {
    const login = await request("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "learner@acme.test", password: "password123" }) });
    expect(login.status).toBe(200);
    const body = await login.json() as { token: string };
    const dashboard = await request("/me/dashboard", { headers: { Authorization: `Bearer ${body.token}` } });
    expect(dashboard.status).toBe(200);
  });

  it("scopes organization admin dashboard records to their tenant", async () => {
    const login = await request("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@acme.test", password: "password123" }) });
    const body = await login.json() as { token: string };
    const dashboard = await request("/me/dashboard", { headers: { Authorization: `Bearer ${body.token}` } });
    const result = await dashboard.json() as { certificates: { verificationId: string }[]; reports: { totalEnrollments: number } };
    expect(dashboard.status).toBe(200);
    expect(result.certificates.map((certificate) => certificate.verificationId)).not.toContain("verify-forklift-nia");
    expect(result.reports.totalEnrollments).toBe(1);
  });

  it("scopes dashboard audit logs by organization while platform admins see both tenants", async () => {
    const adminLogin = await request("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@acme.test", password: "password123" }) });
    const adminBody = await adminLogin.json() as { token: string };
    const adminDashboard = await request("/me/dashboard", { headers: { Authorization: `Bearer ${adminBody.token}` } });
    const adminResult = await adminDashboard.json() as { auditLogs: { organizationId: string | null; targetId: string }[] };
    expect(adminDashboard.status).toBe(200);
    expect(adminResult.auditLogs.length).toBeGreaterThan(0);
    expect(adminResult.auditLogs.every((log) => log.organizationId === "org-acme")).toBe(true);
    expect(adminResult.auditLogs.map((log) => log.targetId)).not.toContain("version-forklift-v1");

    const platformLogin = await request("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "platform@lms.test", password: "password123" }) });
    const platformBody = await platformLogin.json() as { token: string };
    const platformDashboard = await request("/me/dashboard", { headers: { Authorization: `Bearer ${platformBody.token}` } });
    const platformResult = await platformDashboard.json() as { auditLogs: { organizationId: string | null; targetId: string }[] };
    expect(platformDashboard.status).toBe(200);
    expect(platformResult.auditLogs.map((log) => log.targetId)).toEqual(expect.arrayContaining(["version-security-v1", "version-forklift-v1"]));

    const learnerLogin = await request("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "learner@acme.test", password: "password123" }) });
    const learnerBody = await learnerLogin.json() as { token: string };
    const learnerDashboard = await request("/me/dashboard", { headers: { Authorization: `Bearer ${learnerBody.token}` } });
    const learnerResult = await learnerDashboard.json() as { auditLogs: unknown[] };
    expect(learnerDashboard.status).toBe(200);
    expect(learnerResult.auditLogs).toEqual([]);
  });

  it("returns structured health with request id header", async () => {
    const response = await request("/health", { headers: { "x-request-id": "test-request-id" } });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("test-request-id");
    const body = await response.json() as { ok: boolean; dependencies: { database: { configured: boolean } } };
    expect(body.ok).toBe(true);
    expect(body.dependencies.database.configured).toBe(true);
  });

  it("verifies a public certificate without authentication", async () => {
    const response = await request("/certificates/verify/verify-security-lena");
    const body = await response.json() as { status: string; courseTitle: string };
    expect(response.status).toBe(200);
    expect(body.status).toBe("ISSUED");
    expect(body.courseTitle).toContain("Security");
  });

  it("filters catalog within actor visibility", async () => {
    const login = await request("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "learner@acme.test", password: "password123" }) });
    const body = await login.json() as { token: string };
    const catalog = await request("/catalog?q=forklift&status=ALL", { headers: { Authorization: `Bearer ${body.token}` } });
    const result = await catalog.json() as { courses: unknown[]; pagination: { total: number } };
    expect(catalog.status).toBe(200);
    expect(result.courses).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });

  it("returns learner transcript for the owning learner", async () => {
    const login = await request("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "learner@acme.test", password: "password123" }) });
    const body = await login.json() as { token: string };
    const transcript = await request("/learners/user-learner/transcript", { headers: { Authorization: `Bearer ${body.token}` } });
    const result = await transcript.json() as { learner: { password?: string }; records: { courseTitle: string; lessonCompletion: { total: number } }[] };
    expect(transcript.status).toBe(200);
    expect(result.learner.password).toBeUndefined();
    expect(result.records[0].courseTitle).toContain("Security");
    expect(result.records[0].lessonCompletion.total).toBeGreaterThan(0);
  });

  it("rejects lesson progress for lessons outside the enrolled version", async () => {
    const login = await request("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "learner@acme.test", password: "password123" }) });
    const body = await login.json() as { token: string };
    const response = await request("/enrollments/enroll-security-lena/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${body.token}` },
      body: JSON.stringify({ lessonId: "lesson-inspection" })
    });
    expect(response.status).toBe(403);
  });

  it("requires quiz attempts to belong to the learner enrollment", async () => {
    const login = await request("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "learner@acme.test", password: "password123" }) });
    const body = await login.json() as { token: string };
    const response = await request("/quiz-attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${body.token}` },
      body: JSON.stringify({ enrollmentId: "enroll-forklift-nia", quizId: "quiz-security", answers: { q1: "report", q2: "mfa" } })
    });
    expect(response.status).toBe(403);
  });

  it("creates enrollment-scoped quiz attempts and assignment submissions", async () => {
    const login = await request("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "learner@acme.test", password: "password123" }) });
    const body = await login.json() as { token: string };
    const quiz = await request("/quiz-attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${body.token}` },
      body: JSON.stringify({ enrollmentId: "enroll-security-lena", quizId: "quiz-security", answers: { q1: "report", q2: "mfa" } })
    });
    const assignment = await request("/assignment-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${body.token}` },
      body: JSON.stringify({ enrollmentId: "enroll-security-lena", assignmentId: "assignment-security", content: "I would report the message to security and preserve the evidence trail." })
    });
    expect(quiz.status).toBe(201);
    expect(assignment.status).toBe(201);
    expect((await quiz.json() as { enrollmentId: string }).enrollmentId).toBe("enroll-security-lena");
    expect((await assignment.json() as { enrollmentId: string }).enrollmentId).toBe("enroll-security-lena");
  });

  it("blocks learners from browsing audit logs", async () => {
    const login = await request("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "learner@acme.test", password: "password123" }) });
    const body = await login.json() as { token: string };
    const response = await request("/audit-logs", { headers: { Authorization: `Bearer ${body.token}` } });
    expect(response.status).toBe(403);
  });
});
