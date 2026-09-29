import type { AssignmentSubmissionStatus, CertificateStatus, CourseDraftStatus, EnrollmentStatus, LessonProgressStatus, QuizAttemptStatus, Role } from "@lms/domain";

export interface Organization { id: string; name: string; slug: string; }
export interface User { id: string; organizationId: string | null; email: string; name: string; role: Role; password: string; }
export interface Course { id: string; organizationId: string; authorId: string; title: string; summary: string; status: CourseDraftStatus; modules: Module[]; }
export interface Module { id: string; title: string; position: number; lessons: Lesson[]; }
export interface Lesson { id: string; title: string; content: string; position: number; }
export interface CourseVersion { id: string; courseId: string; version: number; title: string; summary: string; lessonIds: string[]; contentSnapshot: unknown; publishedAt: string; }
export interface Enrollment { id: string; learnerId: string; courseVersionId: string; status: EnrollmentStatus; enrolledAt: string; completedAt?: string; }
export interface LessonProgress { id: string; enrollmentId: string; lessonId: string; status: LessonProgressStatus; completedAt?: string; }
export interface Quiz { id: string; courseId: string; title: string; passingScore: number; questions: QuizQuestion[]; }
export interface QuizQuestion { id: string; prompt: string; correctAnswer: string; points: number; }
export interface QuizAttempt { id: string; enrollmentId: string; quizId: string; learnerId: string; status: QuizAttemptStatus; score: number; passed: boolean; answers: Record<string, string>; }
export interface Assignment { id: string; courseId: string; title: string; instructions: string; }
export interface AssignmentSubmission { id: string; enrollmentId: string; assignmentId: string; learnerId: string; content: string; status: AssignmentSubmissionStatus; grade?: number; feedback?: string; }
export interface Certificate { id: string; enrollmentId: string; status: CertificateStatus; verificationId: string; artifactUrl?: string; issuedAt?: string; }
export interface AuditLog { id: string; organizationId: string | null; actorId: string | null; action: string; targetType: string; targetId: string; metadata: unknown; createdAt: string; }

interface DemoStore {
  organizations: Organization[];
  users: User[];
  courses: Course[];
  versions: CourseVersion[];
  enrollments: Enrollment[];
  progress: LessonProgress[];
  quizzes: Quiz[];
  quizAttempts: QuizAttempt[];
  assignments: Assignment[];
  assignmentSubmissions: AssignmentSubmission[];
  certificates: Certificate[];
  auditLogs: AuditLog[];
}

const now = () => new Date().toISOString();

export const store: DemoStore = {
  organizations: [
    { id: "org-acme", name: "Acme Health Systems", slug: "acme-health" },
    { id: "org-nova", name: "Nova Manufacturing", slug: "nova-mfg" }
  ],
  users: [
    { id: "user-learner", organizationId: "org-acme", email: "learner@acme.test", name: "Lena Learner", role: "LEARNER", password: "password123" },
    { id: "user-instructor", organizationId: "org-acme", email: "instructor@acme.test", name: "Iris Instructor", role: "INSTRUCTOR", password: "password123" },
    { id: "user-admin", organizationId: "org-acme", email: "admin@acme.test", name: "Owen Orgadmin", role: "ORG_ADMIN", password: "password123" },
    { id: "user-nova-learner", organizationId: "org-nova", email: "learner@nova.test", name: "Nia Nova", role: "LEARNER", password: "password123" },
    { id: "user-platform", organizationId: null, email: "platform@lms.test", name: "Pat Platform", role: "PLATFORM_ADMIN", password: "password123" }
  ],
  courses: [
    {
      id: "course-security",
      organizationId: "org-acme",
      authorId: "user-instructor",
      title: "Security Awareness Foundations",
      summary: "A practical course on phishing, data handling, and secure workplace habits.",
      status: "PUBLISHED",
      modules: [
        { id: "mod-security-1", title: "Threat Basics", position: 1, lessons: [
          { id: "lesson-phishing", title: "Recognizing Phishing", content: "Learn how attackers use urgency and impersonation.", position: 1 },
          { id: "lesson-passwords", title: "Password Hygiene", content: "Learn how password managers and MFA reduce risk.", position: 2 }
        ] },
        { id: "mod-security-2", title: "Handling Data", position: 2, lessons: [
          { id: "lesson-data", title: "Sensitive Data Handling", content: "Learn how to classify, store, and share regulated data.", position: 1 }
        ] }
      ]
    }
    ,
    {
      id: "course-compliance",
      organizationId: "org-acme",
      authorId: "user-instructor",
      title: "Compliance Reporting Essentials",
      summary: "Learn how regulated teams document completion, incidents, and annual training evidence.",
      status: "PUBLISHED",
      modules: [
        { id: "mod-compliance-1", title: "Evidence Basics", position: 1, lessons: [
          { id: "lesson-evidence", title: "Durable Evidence Records", content: "Why compliance reports need durable source records.", position: 1 }
        ] }
      ]
    },
    {
      id: "course-forklift",
      organizationId: "org-nova",
      authorId: "user-platform",
      title: "Forklift Safety Certification",
      summary: "A manufacturing safety course for equipment operators and floor supervisors.",
      status: "PUBLISHED",
      modules: [
        { id: "mod-forklift-1", title: "Safe Operation", position: 1, lessons: [
          { id: "lesson-inspection", title: "Pre-Shift Inspection", content: "Inspect equipment before operation.", position: 1 }
        ] }
      ]
    }
  ],
  versions: [
    {
      id: "version-security-v1",
      courseId: "course-security",
      version: 1,
      title: "Security Awareness Foundations",
      summary: "Published v1.",
      lessonIds: ["lesson-phishing", "lesson-passwords", "lesson-data"],
      contentSnapshot: { modules: ["Threat Basics", "Handling Data"], lessons: ["lesson-phishing", "lesson-passwords", "lesson-data"], quizzes: ["quiz-security"], assignments: ["assignment-security"] },
      publishedAt: now()
    },
    {
      id: "version-compliance-v1",
      courseId: "course-compliance",
      version: 1,
      title: "Compliance Reporting Essentials",
      summary: "Published v1.",
      lessonIds: ["lesson-evidence"],
      contentSnapshot: { modules: ["Evidence Basics"], lessons: ["lesson-evidence"], quizzes: [], assignments: [] },
      publishedAt: now()
    },
    {
      id: "version-forklift-v1",
      courseId: "course-forklift",
      version: 1,
      title: "Forklift Safety Certification",
      summary: "Published v1.",
      lessonIds: ["lesson-inspection"],
      contentSnapshot: { modules: ["Safe Operation"], lessons: ["lesson-inspection"], quizzes: [], assignments: [] },
      publishedAt: now()
    }
  ],
  enrollments: [
    { id: "enroll-security-lena", learnerId: "user-learner", courseVersionId: "version-security-v1", status: "COMPLETED", enrolledAt: now(), completedAt: now() },
    { id: "enroll-forklift-nia", learnerId: "user-nova-learner", courseVersionId: "version-forklift-v1", status: "COMPLETED", enrolledAt: now(), completedAt: now() }
  ],
  progress: [
    { id: "progress-phishing", enrollmentId: "enroll-security-lena", lessonId: "lesson-phishing", status: "COMPLETED", completedAt: now() },
    { id: "progress-passwords", enrollmentId: "enroll-security-lena", lessonId: "lesson-passwords", status: "COMPLETED", completedAt: now() },
    { id: "progress-data", enrollmentId: "enroll-security-lena", lessonId: "lesson-data", status: "COMPLETED", completedAt: now() },
    { id: "progress-inspection", enrollmentId: "enroll-forklift-nia", lessonId: "lesson-inspection", status: "COMPLETED", completedAt: now() }
  ],
  quizzes: [
    { id: "quiz-security", courseId: "course-security", title: "Security Awareness Check", passingScore: 80, questions: [
      { id: "q1", prompt: "What should you do with a suspicious login email?", correctAnswer: "report", points: 50 },
      { id: "q2", prompt: "What adds protection beyond a password?", correctAnswer: "mfa", points: 50 }
    ] }
  ],
  quizAttempts: [
    { id: "attempt-security-lena", enrollmentId: "enroll-security-lena", quizId: "quiz-security", learnerId: "user-learner", status: "GRADED", score: 100, passed: true, answers: { q1: "report", q2: "mfa" } }
  ] as QuizAttempt[],
  assignments: [
    { id: "assignment-security", courseId: "course-security", title: "Incident Response Reflection", instructions: "Describe how you would report a suspected phishing attempt." }
  ],
  assignmentSubmissions: [
    { id: "submission-security-lena", enrollmentId: "enroll-security-lena", assignmentId: "assignment-security", learnerId: "user-learner", content: "I would report the suspected phishing message to security and preserve evidence.", status: "GRADED", grade: 95, feedback: "Clear, complete response." }
  ] as AssignmentSubmission[],
  certificates: [
    { id: "cert-security-lena", enrollmentId: "enroll-security-lena", status: "ISSUED", verificationId: "verify-security-lena", artifactUrl: "/certificates/enroll-security-lena.pdf", issuedAt: now() },
    { id: "cert-forklift-nia", enrollmentId: "enroll-forklift-nia", status: "ISSUED", verificationId: "verify-forklift-nia", artifactUrl: "/certificates/enroll-forklift-nia.pdf", issuedAt: now() }
  ] as Certificate[],
  auditLogs: [
    { id: "audit-seeded-acme", organizationId: "org-acme", actorId: "user-instructor", action: "course.published", targetType: "CourseVersion", targetId: "version-security-v1", metadata: { seeded: true }, createdAt: now() },
    { id: "audit-seeded-nova", organizationId: "org-nova", actorId: "user-platform", action: "course.published", targetType: "CourseVersion", targetId: "version-forklift-v1", metadata: { seeded: true }, createdAt: now() }
  ] as AuditLog[]
};

// Test/teaching helpers. `resetStore` restores the demo fixture captured at module load so an
// exercise can rebuild the store without editing this file by hand; `seedAuditLogs` builds the
// larger audit fixtures the practice chapter asks for (for example 26 Nova rows and 1 Acme row).
const seededFixture = JSON.parse(JSON.stringify(store)) as DemoStore;

export function resetStore() {
  Object.assign(store, JSON.parse(JSON.stringify(seededFixture)) as DemoStore);
}

export function seedAuditLogs(count: number, organizationId: string, options: { action?: string; targetType?: string; actorId?: string | null } = {}) {
  const action = options.action ?? "course.published";
  const targetType = options.targetType ?? "CourseVersion";
  const actorId = options.actorId === undefined ? null : options.actorId;
  for (let index = 0; index < count; index += 1) {
    store.auditLogs.unshift({ id: `audit-${organizationId}-${index + 1}`, organizationId, actorId, action, targetType, targetId: `${organizationId}-target-${index + 1}`, metadata: { seeded: true, index: index + 1 }, createdAt: now() });
  }
}

export function audit(actorId: string | null, organizationId: string | null, action: string, targetType: string, targetId: string, metadata: unknown = {}) {
  store.auditLogs.unshift({ id: `audit-${store.auditLogs.length + 1}`, actorId, organizationId, action, targetType, targetId, metadata, createdAt: now() });
}
