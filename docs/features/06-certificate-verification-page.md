# 06 - Certificate Verification Page

## Goal

Add public certificate verification by verification ID so employers or compliance reviewers can validate issued certificates without logging in.

## Impacted Codebase Areas

- `apps/api`
- `apps/web`
- Tests
- Docs

## Implementation Approach

Add a public API endpoint that returns a safe certificate verification payload. Add a small verification panel in the frontend. Seed an issued certificate so the flow is immediately inspectable.

## Design Considerations

Verification should expose only safe facts: certificate status, verification ID, issued date, learner display name, course title, and course version. It should not expose private submissions, quiz answers, or internal audit metadata.

## Build Journal

Implemented a public certificate verification endpoint at `/certificates/verify/:verificationId`. The endpoint returns only safe verification facts: status, verification ID, issued date, learner display name, course title, and course version.

Seeded an issued certificate so the workflow is inspectable immediately. Added a dashboard verification panel that can check `verify-security-lena` without using the authenticated API client. Added an API test proving verification works without login.

Tradeoff: the verification page is currently a panel inside the authenticated app shell rather than a dedicated public route. The API boundary is already public; future frontend routing can expose it as a standalone public page.

## Verification

Command run:

- `npm run verify`

Final status: passes.

## Lessons Learned

Generated artifacts need verification metadata. A boolean like `completed: true` is not enough for compliance, external review, or certificate sharing.

Public verification should be intentionally narrow. It must confirm authenticity without leaking private learning records such as quiz answers, assignment content, feedback, or audit metadata.
