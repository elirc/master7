import { completeLesson, gradeQuiz, issueCertificateInput, publishDraft } from "@lms/domain";
import { audit, store } from "./store.js";
import type { Actor } from "@lms/domain";
import { assertCanAccessOwnLearnerRecord, assertCanAuthorCourse, assertCanGradeLearnerWork, assertCanLearnInOrganization, assertCanSubmitLearnerWork } from "./policies.js";

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

function visibleScope(actor: Actor) {
  const organizations = actor.role === "PLATFORM_ADMIN" ? store.organizations : store.organizations.filter((org) => org.id === actor.organizationId);
  const organizationIds = new Set(organizations.map((org) => org.id));
  const courses = store.courses.filter((course) => organizationIds.has(course.organizationId));
  const courseIds = new Set(courses.map((course) => course.id));
  const versions = store.versions.filter((version) => courseIds.has(version.courseId));
  const versionIds = new Set(versions.map((version) => version.id));
  const enrollments = actor.role === "LEARNER"
    ? store.enrollments.filter((enrollment) => enrollment.learnerId === actor.id)
    : store.enrollments.filter((enrollment) => versionIds.has(enrollment.courseVersionId));
  const enrollmentIds = new Set(enrollments.map((enrollment) => enrollment.id));
  return { organizations, courses, versions, enrollments, enrollmentIds };
}

function safeUser(userId: string) {
  const user = store.users.find((candidate) => candidate.id === userId);
  return user ? { id: user.id, organizationId: user.organizationId, email: user.email, name: user.name, role: user.role } : null;
}

export function auditLogScope(actor: Actor) {
  return (log: { organizationId: string | null }) => actor.role === "PLATFORM_ADMIN" || log.organizationId === actor.organizationId;
}

function visibleAuditLogs(actor: Actor) {
  if (actor.role === "LEARNER") return [];
  return store.auditLogs.filter(auditLogScope(actor)).slice(0, 25);
}

function enrollmentContext(enrollmentId: string) {
  const enrollment = store.enrollments.find((candidate) => candidate.id === enrollmentId);
  const version = enrollment ? store.versions.find((candidate) => candidate.id === enrollment.courseVersionId) : undefined;
  const course = version ? store.courses.find((candidate) => candidate.id === version.courseId) : undefined;
  return { enrollment, version, course };
}

function courseSnapshot(courseId: string) {
  const course = store.courses.find((candidate) => candidate.id === courseId);
  return {
    modules: course?.modules.map((module) => ({ id: module.id, title: module.title, lessons: module.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title })) })) ?? [],
    quizzes: store.quizzes.filter((quiz) => quiz.courseId === courseId).map((quiz) => ({ id: quiz.id, title: quiz.title, questionIds: quiz.questions.map((question) => question.id) })),
    assignments: store.assignments.filter((assignment) => assignment.courseId === courseId).map((assignment) => ({ id: assignment.id, title: assignment.title }))
  };
}

export const services = {
  login(email: string, password: string) {
    const user = store.users.find((candidate) => candidate.email === email && candidate.password === password);
    return user ?? null;
  },
  dashboard(actor: Actor) {
    const scope = visibleScope(actor);
    return {
      actor,
      organizations: scope.organizations,
      courses: scope.courses,
      enrollments: scope.enrollments,
      progress: store.progress.filter((progress) => scope.enrollmentIds.has(progress.enrollmentId)),
      quizAttempts: store.quizAttempts.filter((attempt) => scope.enrollmentIds.has(attempt.enrollmentId)),
      assignmentSubmissions: store.assignmentSubmissions.filter((submission) => scope.enrollmentIds.has(submission.enrollmentId)),
      certificates: store.certificates.filter((certificate) => scope.enrollmentIds.has(certificate.enrollmentId)),
      reports: reportingSnapshot(scope.enrollments),
      auditLogs: visibleAuditLogs(actor)
    };
  },
  catalog(actor: Actor, query: { q: string; status: string; organizationId?: string; page: number; pageSize: number }) {
    const visibleOrganizationIds = new Set(visibleScope(actor).organizations.map((org) => org.id));
    const normalizedSearch = query.q.trim().toLowerCase();
    const filtered = store.courses
      .filter((course) => visibleOrganizationIds.has(course.organizationId))
      .filter((course) => !query.organizationId || course.organizationId === query.organizationId)
      .filter((course) => query.status === "ALL" || course.status === query.status)
      .filter((course) => !normalizedSearch || `${course.title} ${course.summary}`.toLowerCase().includes(normalizedSearch));
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const start = (page - 1) * query.pageSize;
    return {
      courses: filtered.slice(start, start + query.pageSize),
      versions: store.versions.filter((version) => filtered.some((course) => course.id === version.courseId)),
      pagination: { page, pageSize: query.pageSize, total, totalPages }
    };
  },
  transcript(actor: Actor, learnerId: string) {
    assertCanAccessOwnLearnerRecord(actor, learnerId);
    const enrollments = store.enrollments.filter((enrollment) => enrollment.learnerId === learnerId);
    return {
      learner: safeUser(learnerId),
      records: enrollments.map((enrollment) => {
        const version = store.versions.find((candidate) => candidate.id === enrollment.courseVersionId);
        const course = version ? store.courses.find((candidate) => candidate.id === version.courseId) : undefined;
        const progress = store.progress.filter((candidate) => candidate.enrollmentId === enrollment.id);
        const quizzes = store.quizAttempts.filter((attempt) => attempt.enrollmentId === enrollment.id);
        const assignments = store.assignmentSubmissions.filter((submission) => submission.enrollmentId === enrollment.id);
        const certificates = store.certificates.filter((certificate) => certificate.enrollmentId === enrollment.id);
        return {
          enrollmentId: enrollment.id,
          courseTitle: version?.title ?? course?.title ?? "Unknown course",
          courseVersion: version?.version ?? 0,
          enrollmentStatus: enrollment.status,
          lessonCompletion: {
            completed: progress.filter((item) => item.status === "COMPLETED").length,
            total: version?.lessonIds.length ?? 0
          },
          quizzes,
          assignments,
          certificates
        };
      })
    };
  },
  verifyCertificate(verificationId: string) {
    const certificate = store.certificates.find((candidate) => candidate.verificationId === verificationId);
    if (!certificate) return null;
    const enrollment = store.enrollments.find((candidate) => candidate.id === certificate.enrollmentId);
    const learner = enrollment ? store.users.find((candidate) => candidate.id === enrollment.learnerId) : undefined;
    const version = enrollment ? store.versions.find((candidate) => candidate.id === enrollment.courseVersionId) : undefined;
    return {
      verificationId: certificate.verificationId,
      status: certificate.status,
      issuedAt: certificate.issuedAt,
      learnerName: learner?.name,
      courseTitle: version?.title,
      courseVersion: version?.version
    };
  },
  auditLogs(actor: Actor, query: { action?: string; targetType?: string; page: number; pageSize: number }) {
    if (actor.role === "LEARNER") throw new Error("Forbidden");
    const scoped = store.auditLogs
      .filter(auditLogScope(actor))
      .filter((log) => !query.action || log.action.includes(query.action))
      .filter((log) => !query.targetType || log.targetType === query.targetType);
    const total = scoped.length;
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const start = (page - 1) * query.pageSize;
    return { auditLogs: scoped.slice(start, start + query.pageSize), pagination: { page, pageSize: query.pageSize, total, totalPages } };
  },
  createCourse(actor: Actor, organizationId: string, title: string, summary: string) {
    assertCanAuthorCourse(actor, organizationId);
    const course = { id: id("course"), organizationId, authorId: actor.id, title, summary, status: "DRAFT" as const, modules: [] };
    store.courses.push(course);
    audit(actor.id, organizationId, "course.created", "Course", course.id, { title });
    return course;
  },
  publishCourse(actor: Actor, courseId: string) {
    const course = store.courses.find((candidate) => candidate.id === courseId);
    if (!course) throw new Error("Course not found");
    assertCanAuthorCourse(actor, course.organizationId);
    course.status = publishDraft(course.status);
    const version = { id: id("version"), courseId: course.id, version: store.versions.filter((candidate) => candidate.courseId === course.id).length + 1, title: course.title, summary: course.summary, lessonIds: course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)), contentSnapshot: courseSnapshot(course.id), publishedAt: now() };
    store.versions.push(version);
    audit(actor.id, course.organizationId, "course.published", "CourseVersion", version.id, { courseId });
    return version;
  },
  enroll(actor: Actor, courseVersionId: string) {
    const version = store.versions.find((candidate) => candidate.id === courseVersionId);
    const course = version ? store.courses.find((candidate) => candidate.id === version.courseId) : null;
    if (!version || !course) throw new Error("Course version not found");
    assertCanLearnInOrganization(actor, course.organizationId);
    const enrollment = { id: id("enroll"), learnerId: actor.id, courseVersionId, status: "ACTIVE" as const, enrolledAt: now() };
    store.enrollments.push(enrollment);
    audit(actor.id, course.organizationId, "enrollment.created", "Enrollment", enrollment.id, { courseVersionId });
    return enrollment;
  },
  completeLesson(actor: Actor, enrollmentId: string, lessonId: string) {
    const { enrollment, version } = enrollmentContext(enrollmentId);
    if (!enrollment || !version) throw new Error("Enrollment not found");
    assertCanAccessOwnLearnerRecord(actor, enrollment.learnerId);
    if (!version.lessonIds.includes(lessonId)) throw new Error("Lesson does not belong to this enrollment version");
    let progress = store.progress.find((candidate) => candidate.enrollmentId === enrollmentId && candidate.lessonId === lessonId);
    if (!progress) {
      progress = { id: id("progress"), enrollmentId, lessonId, status: "NOT_STARTED" };
      store.progress.push(progress);
    }
    progress.status = completeLesson(progress.status);
    progress.completedAt = now();
    maybeCompleteEnrollment(enrollment.id);
    audit(actor.id, actor.organizationId, "lesson.completed", "Lesson", lessonId, { enrollmentId });
    return progress;
  },
  submitQuiz(actor: Actor, enrollmentId: string, quizId: string, answers: Record<string, string>) {
    const { enrollment, version, course } = enrollmentContext(enrollmentId);
    if (!enrollment || !version || !course) throw new Error("Enrollment not found");
    assertCanSubmitLearnerWork(actor, enrollment.learnerId);
    const quiz = store.quizzes.find((candidate) => candidate.id === quizId);
    if (!quiz) throw new Error("Quiz not found");
    if (quiz.courseId !== course.id) throw new Error("Quiz does not belong to this enrollment version");
    const earned = quiz.questions.reduce((sum, question) => sum + (answers[question.id]?.toLowerCase() === question.correctAnswer ? question.points : 0), 0);
    const result = gradeQuiz(earned, quiz.passingScore);
    const attempt = { id: id("attempt"), enrollmentId, quizId, learnerId: actor.id, answers, ...result };
    store.quizAttempts.push(attempt);
    audit(actor.id, actor.organizationId, "quiz.graded", "QuizAttempt", attempt.id, { quizId, score: attempt.score });
    return attempt;
  },
  submitAssignment(actor: Actor, enrollmentId: string, assignmentId: string, content: string) {
    const { enrollment, version, course } = enrollmentContext(enrollmentId);
    if (!enrollment || !version || !course) throw new Error("Enrollment not found");
    assertCanSubmitLearnerWork(actor, enrollment.learnerId);
    const assignment = store.assignments.find((candidate) => candidate.id === assignmentId);
    if (!assignment) throw new Error("Assignment not found");
    if (assignment.courseId !== course.id) throw new Error("Assignment does not belong to this enrollment version");
    const submission = { id: id("submission"), enrollmentId, assignmentId, learnerId: actor.id, content, status: "SUBMITTED" as const };
    store.assignmentSubmissions.push(submission);
    audit(actor.id, actor.organizationId, "assignment.submitted", "AssignmentSubmission", submission.id, { assignmentId });
    return submission;
  },
  gradeAssignment(actor: Actor, submissionId: string, grade: number, feedback: string) {
    const submission = store.assignmentSubmissions.find((candidate) => candidate.id === submissionId);
    if (!submission) throw new Error("Submission not found");
    const learner = store.users.find((candidate) => candidate.id === submission.learnerId);
    if (!learner?.organizationId) throw new Error("Learner organization not found");
    assertCanGradeLearnerWork(actor, learner.organizationId);
    submission.status = "GRADED";
    submission.grade = grade;
    submission.feedback = feedback;
    audit(actor.id, learner.organizationId, "assignment.graded", "AssignmentSubmission", submissionId, { grade });
    return submission;
  },
  issueCertificate(actor: Actor, enrollmentId: string) {
    const enrollment = store.enrollments.find((candidate) => candidate.id === enrollmentId);
    if (!enrollment) throw new Error("Enrollment not found");
    assertCanAccessOwnLearnerRecord(actor, enrollment.learnerId);
    const version = store.versions.find((candidate) => candidate.id === enrollment.courseVersionId);
    const course = version ? store.courses.find((candidate) => candidate.id === version.courseId) : null;
    if (!version || !course) throw new Error("Course not found");
    const completedLessons = store.progress.filter((progress) => progress.enrollmentId === enrollmentId && progress.status === "COMPLETED").length;
    const quizPassed = store.quizAttempts.some((attempt) => attempt.enrollmentId === enrollmentId && attempt.passed);
    const assignmentPassed = store.assignmentSubmissions.some((submission) => submission.enrollmentId === enrollmentId && submission.status === "GRADED" && (submission.grade ?? 0) >= 80);
    const status = issueCertificateInput({ enrollmentStatus: enrollment.status, completedLessons, totalLessons: version.lessonIds.length, requiredQuizPassed: quizPassed, requiredAssignmentPassed: assignmentPassed });
    const certificate = { id: id("cert"), enrollmentId, status, verificationId: id("verify"), artifactUrl: status === "ISSUED" ? `/certificates/${enrollmentId}.pdf` : undefined, issuedAt: status === "ISSUED" ? now() : undefined };
    store.certificates.push(certificate);
    audit(actor.id, course.organizationId, "certificate.requested", "Certificate", certificate.id, { status });
    return certificate;
  }
};

function maybeCompleteEnrollment(enrollmentId: string) {
  const enrollment = store.enrollments.find((candidate) => candidate.id === enrollmentId);
  const version = enrollment ? store.versions.find((candidate) => candidate.id === enrollment.courseVersionId) : null;
  if (!enrollment || !version) return;
  const completed = store.progress.filter((progress) => progress.enrollmentId === enrollmentId && progress.status === "COMPLETED").length;
  if (completed >= version.lessonIds.length) {
    enrollment.status = "COMPLETED";
    enrollment.completedAt = now();
  }
}

function reportingSnapshot(enrollments: typeof store.enrollments) {
  const enrollmentIds = new Set(enrollments.map((enrollment) => enrollment.id));
  const attempts = store.quizAttempts.filter((attempt) => enrollmentIds.has(attempt.enrollmentId));
  return {
    totalEnrollments: enrollments.length,
    completions: enrollments.filter((enrollment) => enrollment.status === "COMPLETED").length,
    certificatesIssued: store.certificates.filter((certificate) => certificate.status === "ISSUED" && enrollments.some((enrollment) => enrollment.id === certificate.enrollmentId)).length,
    averageQuizScore: Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / Math.max(attempts.length, 1))
  };
}
