# Web Dashboard Walkthrough

File: `apps/web/src/main.tsx`

This file is the feature-01 product surface. It lets a developer log in as a learner, instructor, organization admin, or platform admin and see how the same API data appears through different roles.

The frontend hides or shows actions by role, but it does not own security. The API repeats authorization checks for every sensitive action.

The learner workflow creates progress, quiz attempt, and assignment submission records. The instructor/admin workflow creates draft course records. Reporting panels read from the API dashboard response.

Future work should split this file into route, API client, dashboard, catalog, authoring, grading, and audit components.
