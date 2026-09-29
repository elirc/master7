import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Award, BookOpen, CheckCircle2, ClipboardCheck, FileText, GraduationCap, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import "./styles.css";

type Role = "LEARNER" | "INSTRUCTOR" | "ORG_ADMIN" | "PLATFORM_ADMIN";
type User = { id: string; name: string; email: string; role: Role; organizationId: string | null };
type Dashboard = {
  actor: { id: string; role: Role; organizationId: string | null };
  organizations: { id: string; name: string }[];
  courses: Course[];
  enrollments: { id: string; learnerId: string; courseVersionId: string; status: string }[];
  progress: { id: string; enrollmentId: string; lessonId: string; status: string }[];
  quizAttempts: { id: string; score: number; passed: boolean }[];
  assignmentSubmissions: { id: string; status: string; grade?: number; feedback?: string }[];
  certificates: { id: string; status: string; verificationId: string }[];
  reports: { totalEnrollments: number; completions: number; certificatesIssued: number; averageQuizScore: number };
  auditLogs: { id: string; action: string; targetType: string; targetId: string; createdAt: string }[];
};
type Course = { id: string; organizationId: string; title: string; summary: string; status: string; modules: { id: string; title: string; lessons: { id: string; title: string; content: string }[] }[] };
type Transcript = { records: { enrollmentId: string; courseTitle: string; courseVersion: number; enrollmentStatus: string; lessonCompletion: { completed: number; total: number }; quizzes: { id: string; score: number; passed: boolean }[]; assignments: { id: string; status: string; grade?: number }[]; certificates: { id: string; status: string }[] }[] };

const demoUsers = [
  ["learner@acme.test", "Learner"],
  ["instructor@acme.test", "Instructor"],
  ["admin@acme.test", "Org Admin"],
  ["platform@lms.test", "Platform Admin"]
] as const;

function App() {
  const [token, setToken] = useState(localStorage.getItem("lms-token") ?? "");
  const [user, setUser] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalog, setCatalog] = useState<{ courses: Course[]; pagination: { page: number; total: number; totalPages: number } } | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [verificationId, setVerificationId] = useState("verify-security-lena");
  const [verification, setVerification] = useState<{ status: string; learnerName: string; courseTitle: string; courseVersion: number; issuedAt?: string } | null>(null);
  const [auditLogs, setAuditLogs] = useState<Dashboard["auditLogs"]>([]);

  async function login(email: string) {
    setBusy(true);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "password123" }) });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(body.error ?? "Login failed");
    localStorage.setItem("lms-token", body.token);
    setToken(body.token);
    setUser(body.user);
  }

  async function api(path: string, init: RequestInit = {}) {
    const response = await fetch(`/api${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
    if (!response.ok) {
      const body = await response.json();
      throw new Error(body.error?.message ?? body.error ?? "Request failed");
    }
    return response.json();
  }

  async function refresh() {
    if (!token) return;
    const next = await api("/me/dashboard");
    setDashboard(next);
    setTranscript(await api(`/learners/${next.actor.id}/transcript`));
    if (next.actor.role !== "LEARNER") {
      const audit = await api("/audit-logs?pageSize=10");
      setAuditLogs(audit.auditLogs);
    } else {
      setAuditLogs([]);
    }
    const params = new URLSearchParams({ q: catalogSearch, status: "ALL", pageSize: "5" });
    setCatalog(await api(`/catalog?${params.toString()}`));
  }

  useEffect(() => { refresh().catch(() => setToken("")); }, [token, catalogSearch]);

  const firstEnrollment = dashboard?.enrollments[0];
  const firstCourse = dashboard?.courses[0];
  const incompleteLesson = useMemo(() => {
    const lessons = firstCourse?.modules.flatMap((module) => module.lessons) ?? [];
    return lessons.find((lesson) => !dashboard?.progress.some((progress) => progress.lessonId === lesson.id && progress.status === "COMPLETED")) ?? lessons[0];
  }, [dashboard, firstCourse]);

  async function runLearnerFlow() {
    if (!firstEnrollment || !incompleteLesson) return;
    setBusy(true);
    try {
      await api(`/enrollments/${firstEnrollment.id}/progress`, { method: "POST", body: JSON.stringify({ lessonId: incompleteLesson.id }) });
      await api("/quiz-attempts", { method: "POST", body: JSON.stringify({ enrollmentId: firstEnrollment.id, quizId: "quiz-security", answers: { q1: "report", q2: "mfa" } }) });
      await api("/assignment-submissions", { method: "POST", body: JSON.stringify({ enrollmentId: firstEnrollment.id, assignmentId: "assignment-security", content: "I would report the message to security, avoid clicking links, and preserve evidence for review." }) });
      setMessage("Learning records created. Ask an instructor/admin to grade the assignment before certificate issuance.");
      await refresh();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function createDraftCourse() {
    setBusy(true);
    try {
      await api("/courses", { method: "POST", body: JSON.stringify({ organizationId: "org-acme", title: "Workplace Compliance Essentials", summary: "A draft course used to teach authoring, publication, and audit history." }) });
      setMessage("Draft course created with an audit log entry.");
      await refresh();
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCertificate() {
    setBusy(true);
    try {
      const response = await fetch(`/api/certificates/verify/${verificationId}`);
      if (!response.ok) throw new Error("Certificate not found");
      setVerification(await response.json());
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!token || !dashboard) {
    return <main className="login-screen">
      <section className="login-panel">
        <div>
          <GraduationCap size={42} />
          <h1>Enterprise Learning Console</h1>
          <p>Choose a seeded role to inspect the LMS from different authorization boundaries.</p>
        </div>
        <div className="login-grid">
          {demoUsers.map(([email, label]) => <button disabled={busy} key={email} onClick={() => login(email)}>{label}<span>{email}</span></button>)}
        </div>
      </section>
    </main>;
  }

  return <main className="app-shell">
    <aside>
      <div className="brand"><GraduationCap /> LMS Enterprise</div>
      <nav>
        <a><LayoutDashboard /> Dashboard</a>
        <a><BookOpen /> Catalog</a>
        <a><ClipboardCheck /> Grading</a>
        <a><Award /> Certificates</a>
        <a><ShieldCheck /> Audit</a>
      </nav>
      <button className="ghost" onClick={() => { localStorage.removeItem("lms-token"); setToken(""); setDashboard(null); }}>Sign out</button>
    </aside>
    <section className="workspace">
      <header>
        <div>
          <p>{user?.role.replace("_", " ")}</p>
          <h1>{user?.name ?? dashboard.actor.id}</h1>
        </div>
        <button disabled={busy} onClick={refresh}>Refresh</button>
      </header>
      {message && <div className="notice">{message}</div>}
      <section className="metrics">
        <Metric icon={<Users />} label="Enrollments" value={dashboard.reports.totalEnrollments} />
        <Metric icon={<CheckCircle2 />} label="Completions" value={dashboard.reports.completions} />
        <Metric icon={<Award />} label="Certificates" value={dashboard.reports.certificatesIssued} />
        <Metric icon={<FileText />} label="Avg Quiz" value={`${dashboard.reports.averageQuizScore}%`} />
      </section>
      <section className="grid">
        <div className="panel wide">
          <div className="panel-title"><BookOpen /> Course Catalog</div>
          <input className="search" value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="Search courses" />
          {(catalog?.courses ?? dashboard.courses).map((course) => <article className="course" key={course.id}>
            <div><h2>{course.title}</h2><p>{course.summary}</p></div>
            <span>{course.status}</span>
          </article>)}
          {catalog && <p className="fine-print">Showing {catalog.courses.length} of {catalog.pagination.total} results.</p>}
        </div>
        <div className="panel">
          <div className="panel-title"><ClipboardCheck /> Actions</div>
          {dashboard.actor.role === "LEARNER" ? <button disabled={busy} onClick={runLearnerFlow}>Complete learner workflow</button> : <button disabled={busy} onClick={createDraftCourse}>Create draft course</button>}
          <p className="fine-print">API services enforce the real boundary; these controls only shape the role-specific experience.</p>
        </div>
        <div className="panel">
          <div className="panel-title"><CheckCircle2 /> Progress</div>
          {dashboard.progress.map((progress) => <p key={progress.id}>{progress.lessonId}: <strong>{progress.status}</strong></p>)}
        </div>
        <div className="panel">
          <div className="panel-title"><Award /> Certificates</div>
          {dashboard.certificates.length ? dashboard.certificates.map((certificate) => <p key={certificate.id}>{certificate.status}: {certificate.verificationId}</p>) : <p>No certificates yet.</p>}
        </div>
        <div className="panel">
          <div className="panel-title"><ShieldCheck /> Verify Certificate</div>
          <input className="search" value={verificationId} onChange={(event) => setVerificationId(event.target.value)} />
          <button disabled={busy} onClick={verifyCertificate}>Verify</button>
          {verification && <p className="fine-print">{verification.status}: {verification.learnerName} completed {verification.courseTitle} v{verification.courseVersion}</p>}
        </div>
        <div className="panel wide">
          <div className="panel-title"><FileText /> Learner Transcript</div>
          {transcript?.records.map((record) => <article className="course" key={record.enrollmentId}>
            <div><h2>{record.courseTitle} v{record.courseVersion}</h2><p>{record.lessonCompletion.completed}/{record.lessonCompletion.total} lessons complete, {record.quizzes.length} quiz attempts, {record.assignments.length} submissions</p></div>
            <span>{record.enrollmentStatus}</span>
          </article>)}
        </div>
        <div className="panel wide">
          <div className="panel-title"><ShieldCheck /> Audit Trail</div>
          {auditLogs.length ? auditLogs.map((log) => <p key={log.id}>{log.action} on {log.targetType} at {new Date(log.createdAt).toLocaleString()}</p>) : <p>Audit logs are hidden from learners.</p>}
        </div>
      </section>
    </section>
  </main>;
}

function Metric(props: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return <div className="metric">{props.icon}<span>{props.label}</span><strong>{props.value}</strong></div>;
}

createRoot(document.getElementById("root")!).render(<App />);
