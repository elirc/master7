export type Role = "LEARNER" | "INSTRUCTOR" | "ORG_ADMIN" | "PLATFORM_ADMIN";
export type CourseDraftStatus = "DRAFT" | "READY_FOR_REVIEW" | "PUBLISHED" | "ARCHIVED";
export type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type LessonProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type QuizAttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "GRADED";
export type AssignmentSubmissionStatus = "DRAFT" | "SUBMITTED" | "GRADED" | "RETURNED";
export type CertificateStatus = "PENDING" | "ISSUED" | "REVOKED";

export interface Actor {
  id: string;
  role: Role;
  organizationId: string | null;
}

export function canManageOrganization(actor: Actor, organizationId: string): boolean {
  return actor.role === "PLATFORM_ADMIN" || (actor.role === "ORG_ADMIN" && actor.organizationId === organizationId);
}

export function canAuthorCourse(actor: Actor, organizationId: string): boolean {
  return actor.role === "PLATFORM_ADMIN" || ((actor.role === "INSTRUCTOR" || actor.role === "ORG_ADMIN") && actor.organizationId === organizationId);
}

export function canLearnInOrganization(actor: Actor, organizationId: string): boolean {
  return actor.role === "PLATFORM_ADMIN" || actor.organizationId === organizationId;
}

export function publishDraft(status: CourseDraftStatus): CourseDraftStatus {
  if (status !== "DRAFT" && status !== "READY_FOR_REVIEW") {
    throw new Error(`Cannot publish course draft from ${status}`);
  }
  return "PUBLISHED";
}

export function completeLesson(current: LessonProgressStatus): LessonProgressStatus {
  if (current === "COMPLETED") return current;
  return "COMPLETED";
}

export function gradeQuiz(score: number, passingScore: number): { score: number; passed: boolean; status: QuizAttemptStatus } {
  if (score < 0 || score > 100) throw new Error("Quiz score must be between 0 and 100");
  return { score, passed: score >= passingScore, status: "GRADED" };
}

export function issueCertificateInput(args: {
  enrollmentStatus: EnrollmentStatus;
  completedLessons: number;
  totalLessons: number;
  requiredQuizPassed: boolean;
  requiredAssignmentPassed: boolean;
}): CertificateStatus {
  if (
    args.enrollmentStatus === "COMPLETED" &&
    args.totalLessons > 0 &&
    args.completedLessons >= args.totalLessons &&
    args.requiredQuizPassed &&
    args.requiredAssignmentPassed
  ) {
    return "ISSUED";
  }
  return "PENDING";
}
