# System Design Forward Plan

This document defines where the LMS/certification platform is going and which rules future features must protect.

## Architectural Rules

- Backend services are the source of business truth.
- Frontend role checks are UX only; API authorization is mandatory.
- Organization isolation must be enforced in data access paths.
- Workflow state changes should use explicit domain helpers, not arbitrary string updates.
- Durable source records must exist before derived reports, notifications, certificates, or exports.
- Feature docs are created before implementation, then updated with build journals and verification notes.

## Cross-Cutting Concerns

### Authentication And Authorization

Use signed tokens for local development and keep user role, organization membership, and platform-level access separate. Add policy tests for organization admin, instructor, learner, and platform admin access.

### Tenant Isolation

Most business records belong to an organization. Platform admins may cross tenant boundaries; organization admins should not. Repository methods should accept an actor context so isolation is enforced near data access and workflow boundaries.

### Workflow State Machines

Course publication, enrollment, lesson progress, quiz attempts, assignment grading, certificate generation, imports, exports, and notification delivery all need explicit lifecycle states.

### Course And Content Versioning

Authoring drafts must be separate from published versions. Enrollments point to published course versions. Progress points to enrollments. Future course edits should not rewrite learner history.

### Money And Billing

Billing is out of scope for the initial slice. If introduced, plan limits and billing records should not be mixed directly into learning records; entitlements should be checked through a small policy layer.

### Files And Generated Artifacts

Assignments, certificates, exports, and content packages should store metadata separately from binary storage. Generated artifacts need verification IDs, hashes, and regeneration history.

### Background Jobs

Use jobs for retryable side effects: certificate generation, reminders, exports, imports, video processing, and notifications. Add idempotency keys before jobs become persistent.

### Auditability

Audit security-sensitive and compliance-sensitive actions: role changes, publication, enrollment changes, grading, certificate issuance, impersonation, and exports.

### Notifications

Notifications should be generated from durable events, not one-off controller code. Users need preferences before notification volume grows.

### Reporting

Reports should read from learning records and materialized summaries where needed. Never rely on frontend-only calculations for official completion.

### API Contracts

Use shared schemas for request/response validation. As clients multiply, introduce generated clients or OpenAPI output.

### Testing

Protect domain helpers, authorization boundaries, workflow services, and end-to-end learner/instructor paths. Add database integration tests as persistence becomes real.

### Observability

Add health checks, structured logs, request IDs, job metrics, and dashboardable failure counts before the system becomes operationally complex.

## Future Feature Backlog

1. Initial enterprise LMS vertical slice
2. Prisma-backed repository layer and migrations
3. Password reset and invitation workflow
4. Course version diff viewer
5. Scheduled cohorts
6. Cohort enrollment approval workflow
7. Course search, filtering, and pagination
8. Prerequisites and gated enrollment
9. Learning paths
10. Discussion forums
11. Instructor announcement tools
12. Assignment rubrics
13. Grading workflow queue
14. Instructor feedback templates
15. Quiz question banks
16. Randomized quiz attempts
17. Quiz retake policies
18. Due dates and late submission rules
19. Completion rules engine
20. Learner transcript
21. Certificate verification page
22. Certificate revocation workflow
23. Compliance expiration rules
24. Recertification workflows
25. Organization-level reporting
26. Manager dashboards
27. Teams and departments
28. Skills and competency tracking
29. Bulk learner import
30. Import validation results
31. CSV exports
32. Export jobs with artifact records
33. Notification preferences
34. Reminder jobs
35. Domain events
36. Outbox pattern
37. Background job retry policies
38. Operational task queue
39. Audit log viewer
40. Admin impersonation
41. Feature flags
42. Organization settings
43. Billing plan limits
44. Public enterprise API
45. API contract generation
46. Observability and health checks
47. End-to-end browser workflows
48. Database migration discipline
49. SCORM-like content packages
50. Video processing mock pipeline
51. Accessibility and keyboard audit
52. Final system design documentation
