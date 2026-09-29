import { z } from "zod";

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const createCourseRequestSchema = z.object({
  organizationId: z.string(),
  title: z.string().min(3),
  summary: z.string().min(10)
});

export const publishCourseRequestSchema = z.object({
  courseId: z.string()
});

export const enrollRequestSchema = z.object({
  courseVersionId: z.string()
});

export const lessonProgressRequestSchema = z.object({
  lessonId: z.string()
});

export const quizAttemptRequestSchema = z.object({
  enrollmentId: z.string(),
  quizId: z.string(),
  answers: z.record(z.string(), z.string())
});

export const assignmentSubmissionRequestSchema = z.object({
  enrollmentId: z.string(),
  assignmentId: z.string(),
  content: z.string().min(20)
});

export const gradeAssignmentRequestSchema = z.object({
  grade: z.coerce.number().int().min(0).max(100),
  feedback: z.string().max(2000).default("")
});

export const catalogQuerySchema = z.object({
  q: z.string().optional().default(""),
  status: z.enum(["DRAFT", "READY_FOR_REVIEW", "PUBLISHED", "ARCHIVED", "ALL"]).optional().default("PUBLISHED"),
  organizationId: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(10)
});

export const auditLogQuerySchema = z.object({
  action: z.string().optional(),
  targetType: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25)
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
