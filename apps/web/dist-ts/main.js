import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Award, BookOpen, CheckCircle2, ClipboardCheck, FileText, GraduationCap, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import "./styles.css";
const demoUsers = [
    ["learner@acme.test", "Learner"],
    ["instructor@acme.test", "Instructor"],
    ["admin@acme.test", "Org Admin"],
    ["platform@lms.test", "Platform Admin"]
];
function App() {
    const [token, setToken] = useState(localStorage.getItem("lms-token") ?? "");
    const [user, setUser] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [catalogSearch, setCatalogSearch] = useState("");
    const [catalog, setCatalog] = useState(null);
    const [transcript, setTranscript] = useState(null);
    const [verificationId, setVerificationId] = useState("verify-security-lena");
    const [verification, setVerification] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    async function login(email) {
        setBusy(true);
        const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "password123" }) });
        const body = await response.json();
        setBusy(false);
        if (!response.ok)
            return setMessage(body.error ?? "Login failed");
        localStorage.setItem("lms-token", body.token);
        setToken(body.token);
        setUser(body.user);
    }
    async function api(path, init = {}) {
        const response = await fetch(`/api${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
        if (!response.ok) {
            const body = await response.json();
            throw new Error(body.error?.message ?? body.error ?? "Request failed");
        }
        return response.json();
    }
    async function refresh() {
        if (!token)
            return;
        const next = await api("/me/dashboard");
        setDashboard(next);
        setTranscript(await api(`/learners/${next.actor.id}/transcript`));
        if (next.actor.role !== "LEARNER") {
            const audit = await api("/audit-logs?pageSize=10");
            setAuditLogs(audit.auditLogs);
        }
        else {
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
        if (!firstEnrollment || !incompleteLesson)
            return;
        setBusy(true);
        try {
            await api(`/enrollments/${firstEnrollment.id}/progress`, { method: "POST", body: JSON.stringify({ lessonId: incompleteLesson.id }) });
            await api("/quiz-attempts", { method: "POST", body: JSON.stringify({ enrollmentId: firstEnrollment.id, quizId: "quiz-security", answers: { q1: "report", q2: "mfa" } }) });
            await api("/assignment-submissions", { method: "POST", body: JSON.stringify({ enrollmentId: firstEnrollment.id, assignmentId: "assignment-security", content: "I would report the message to security, avoid clicking links, and preserve evidence for review." }) });
            setMessage("Learning records created. Ask an instructor/admin to grade the assignment before certificate issuance.");
            await refresh();
        }
        catch (error) {
            setMessage(error.message);
        }
        finally {
            setBusy(false);
        }
    }
    async function createDraftCourse() {
        setBusy(true);
        try {
            await api("/courses", { method: "POST", body: JSON.stringify({ organizationId: "org-acme", title: "Workplace Compliance Essentials", summary: "A draft course used to teach authoring, publication, and audit history." }) });
            setMessage("Draft course created with an audit log entry.");
            await refresh();
        }
        catch (error) {
            setMessage(error.message);
        }
        finally {
            setBusy(false);
        }
    }
    async function verifyCertificate() {
        setBusy(true);
        try {
            const response = await fetch(`/api/certificates/verify/${verificationId}`);
            if (!response.ok)
                throw new Error("Certificate not found");
            setVerification(await response.json());
        }
        catch (error) {
            setMessage(error.message);
        }
        finally {
            setBusy(false);
        }
    }
    if (!token || !dashboard) {
        return _jsx("main", { className: "login-screen", children: _jsxs("section", { className: "login-panel", children: [_jsxs("div", { children: [_jsx(GraduationCap, { size: 42 }), _jsx("h1", { children: "Enterprise Learning Console" }), _jsx("p", { children: "Choose a seeded role to inspect the LMS from different authorization boundaries." })] }), _jsx("div", { className: "login-grid", children: demoUsers.map(([email, label]) => _jsxs("button", { disabled: busy, onClick: () => login(email), children: [label, _jsx("span", { children: email })] }, email)) })] }) });
    }
    return _jsxs("main", { className: "app-shell", children: [_jsxs("aside", { children: [_jsxs("div", { className: "brand", children: [_jsx(GraduationCap, {}), " LMS Enterprise"] }), _jsxs("nav", { children: [_jsxs("a", { children: [_jsx(LayoutDashboard, {}), " Dashboard"] }), _jsxs("a", { children: [_jsx(BookOpen, {}), " Catalog"] }), _jsxs("a", { children: [_jsx(ClipboardCheck, {}), " Grading"] }), _jsxs("a", { children: [_jsx(Award, {}), " Certificates"] }), _jsxs("a", { children: [_jsx(ShieldCheck, {}), " Audit"] })] }), _jsx("button", { className: "ghost", onClick: () => { localStorage.removeItem("lms-token"); setToken(""); setDashboard(null); }, children: "Sign out" })] }), _jsxs("section", { className: "workspace", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("p", { children: user?.role.replace("_", " ") }), _jsx("h1", { children: user?.name ?? dashboard.actor.id })] }), _jsx("button", { disabled: busy, onClick: refresh, children: "Refresh" })] }), message && _jsx("div", { className: "notice", children: message }), _jsxs("section", { className: "metrics", children: [_jsx(Metric, { icon: _jsx(Users, {}), label: "Enrollments", value: dashboard.reports.totalEnrollments }), _jsx(Metric, { icon: _jsx(CheckCircle2, {}), label: "Completions", value: dashboard.reports.completions }), _jsx(Metric, { icon: _jsx(Award, {}), label: "Certificates", value: dashboard.reports.certificatesIssued }), _jsx(Metric, { icon: _jsx(FileText, {}), label: "Avg Quiz", value: `${dashboard.reports.averageQuizScore}%` })] }), _jsxs("section", { className: "grid", children: [_jsxs("div", { className: "panel wide", children: [_jsxs("div", { className: "panel-title", children: [_jsx(BookOpen, {}), " Course Catalog"] }), _jsx("input", { className: "search", value: catalogSearch, onChange: (event) => setCatalogSearch(event.target.value), placeholder: "Search courses" }), (catalog?.courses ?? dashboard.courses).map((course) => _jsxs("article", { className: "course", children: [_jsxs("div", { children: [_jsx("h2", { children: course.title }), _jsx("p", { children: course.summary })] }), _jsx("span", { children: course.status })] }, course.id)), catalog && _jsxs("p", { className: "fine-print", children: ["Showing ", catalog.courses.length, " of ", catalog.pagination.total, " results."] })] }), _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "panel-title", children: [_jsx(ClipboardCheck, {}), " Actions"] }), dashboard.actor.role === "LEARNER" ? _jsx("button", { disabled: busy, onClick: runLearnerFlow, children: "Complete learner workflow" }) : _jsx("button", { disabled: busy, onClick: createDraftCourse, children: "Create draft course" }), _jsx("p", { className: "fine-print", children: "API services enforce the real boundary; these controls only shape the role-specific experience." })] }), _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "panel-title", children: [_jsx(CheckCircle2, {}), " Progress"] }), dashboard.progress.map((progress) => _jsxs("p", { children: [progress.lessonId, ": ", _jsx("strong", { children: progress.status })] }, progress.id))] }), _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "panel-title", children: [_jsx(Award, {}), " Certificates"] }), dashboard.certificates.length ? dashboard.certificates.map((certificate) => _jsxs("p", { children: [certificate.status, ": ", certificate.verificationId] }, certificate.id)) : _jsx("p", { children: "No certificates yet." })] }), _jsxs("div", { className: "panel", children: [_jsxs("div", { className: "panel-title", children: [_jsx(ShieldCheck, {}), " Verify Certificate"] }), _jsx("input", { className: "search", value: verificationId, onChange: (event) => setVerificationId(event.target.value) }), _jsx("button", { disabled: busy, onClick: verifyCertificate, children: "Verify" }), verification && _jsxs("p", { className: "fine-print", children: [verification.status, ": ", verification.learnerName, " completed ", verification.courseTitle, " v", verification.courseVersion] })] }), _jsxs("div", { className: "panel wide", children: [_jsxs("div", { className: "panel-title", children: [_jsx(FileText, {}), " Learner Transcript"] }), transcript?.records.map((record) => _jsxs("article", { className: "course", children: [_jsxs("div", { children: [_jsxs("h2", { children: [record.courseTitle, " v", record.courseVersion] }), _jsxs("p", { children: [record.lessonCompletion.completed, "/", record.lessonCompletion.total, " lessons complete, ", record.quizzes.length, " quiz attempts, ", record.assignments.length, " submissions"] })] }), _jsx("span", { children: record.enrollmentStatus })] }, record.enrollmentId))] }), _jsxs("div", { className: "panel wide", children: [_jsxs("div", { className: "panel-title", children: [_jsx(ShieldCheck, {}), " Audit Trail"] }), auditLogs.length ? auditLogs.map((log) => _jsxs("p", { children: [log.action, " on ", log.targetType, " at ", new Date(log.createdAt).toLocaleString()] }, log.id)) : _jsx("p", { children: "Audit logs are hidden from learners." })] })] })] })] });
}
function Metric(props) {
    return _jsxs("div", { className: "metric", children: [props.icon, _jsx("span", { children: props.label }), _jsx("strong", { children: props.value })] });
}
createRoot(document.getElementById("root")).render(_jsx(App, {}));
