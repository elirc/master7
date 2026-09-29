import cors from "cors";
import express from "express";
import { loadConfig } from "@lms/config";
import {
  assignmentSubmissionRequestSchema,
  auditLogQuerySchema,
  catalogQuerySchema,
  createCourseRequestSchema,
  enrollRequestSchema,
  gradeAssignmentRequestSchema,
  lessonProgressRequestSchema,
  loginRequestSchema,
  publishCourseRequestSchema,
  quizAttemptRequestSchema
} from "@lms/contracts";
import { requireAuth, signUser, type AuthedRequest } from "./auth.js";
import { errorMiddleware } from "./errors.js";
import { healthSnapshot, requestLogger } from "./observability.js";
import { services } from "./services.js";

type RouteHandler = (req: AuthedRequest, res: express.Response) => unknown;
const route = (handler: RouteHandler): express.RequestHandler => (req, res, next) => {
  Promise.resolve(handler(req as AuthedRequest, res)).catch(next);
};

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  app.get("/health", (_req, res) => res.json(healthSnapshot()));
  app.get("/certificates/verify/:verificationId", (req, res) => {
    const result = services.verifyCertificate(req.params.verificationId);
    if (!result) return res.status(404).json({ error: "Certificate not found" });
    return res.json(result);
  });
  app.post("/auth/login", (req, res) => {
    const parsed = loginRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const user = services.login(parsed.data.email, parsed.data.password);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    return res.json({ token: signUser(user.id), user: { id: user.id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId } });
  });

  app.use(requireAuth);
  app.get("/me/dashboard", route((req, res) => res.json(services.dashboard(req.actor!))));
  app.get("/catalog", route((req, res) => {
    const parsed = catalogQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.json(services.catalog(req.actor!, parsed.data));
  }));
  app.get("/learners/:learnerId/transcript", route((req, res) => res.json(services.transcript(req.actor!, req.params.learnerId))));
  app.get("/audit-logs", route((req, res) => {
    const parsed = auditLogQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.json(services.auditLogs(req.actor!, parsed.data));
  }));
  app.post("/courses", route((req, res) => {
    const parsed = createCourseRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.status(201).json(services.createCourse(req.actor!, parsed.data.organizationId, parsed.data.title, parsed.data.summary));
  }));
  app.post("/courses/publish", route((req, res) => {
    const parsed = publishCourseRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.status(201).json(services.publishCourse(req.actor!, parsed.data.courseId));
  }));
  app.post("/enrollments", route((req, res) => {
    const parsed = enrollRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.status(201).json(services.enroll(req.actor!, parsed.data.courseVersionId));
  }));
  app.post("/enrollments/:enrollmentId/progress", route((req, res) => {
    const parsed = lessonProgressRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.json(services.completeLesson(req.actor!, req.params.enrollmentId, parsed.data.lessonId));
  }));
  app.post("/quiz-attempts", route((req, res) => {
    const parsed = quizAttemptRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.status(201).json(services.submitQuiz(req.actor!, parsed.data.enrollmentId, parsed.data.quizId, parsed.data.answers));
  }));
  app.post("/assignment-submissions", route((req, res) => {
    const parsed = assignmentSubmissionRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.status(201).json(services.submitAssignment(req.actor!, parsed.data.enrollmentId, parsed.data.assignmentId, parsed.data.content));
  }));
  app.post("/assignment-submissions/:submissionId/grade", route((req, res) => {
    const parsed = gradeAssignmentRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    return res.json(services.gradeAssignment(req.actor!, req.params.submissionId, parsed.data.grade, parsed.data.feedback));
  }));
  app.post("/enrollments/:enrollmentId/certificates", route((req, res) => res.status(201).json(services.issueCertificate(req.actor!, req.params.enrollmentId))));

  app.use(errorMiddleware);

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const config = loadConfig();
  createApp().listen(config.API_PORT, () => console.log(`LMS API listening on http://localhost:${config.API_PORT}`));
}
