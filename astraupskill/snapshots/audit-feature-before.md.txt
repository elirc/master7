# 07 - Audit Log Viewer

## Goal

Create an admin-facing audit log endpoint with filtering so important actions can be inspected by organization admins, instructors, and platform admins.

## Impacted Codebase Areas

- `packages/contracts`
- `apps/api`
- `apps/web`
- Tests
- Docs

## Implementation Approach

Add query validation for audit logs, a service method that scopes audit visibility by actor role, and an API endpoint. Update the dashboard audit panel to use the endpoint.

## Design Considerations

Audit logs are compliance-sensitive. Learners should not browse audit records. Organization users should only see their organization's audit records unless they are platform admins.

## Build Journal

Implemented `auditLogQuerySchema`, `services.auditLogs`, and `/audit-logs`. The endpoint supports action, target type, page, and page size filters. It scopes records by actor: platform admins can see all logs, organization-scoped admins and instructors see their organization logs, and learners are blocked.

The frontend audit panel now reads from the audit log endpoint for non-learner roles. This makes the compliance trail an explicit product surface rather than incidental dashboard data.

Added an API test proving learners cannot browse audit logs. That test matters because audit logs often contain sensitive operational and compliance information.

Tradeoff: audit log filtering is currently simple string matching over the in-memory store. Production hardening should move this to indexed database queries, add date ranges, actor filters, immutable retention rules, and export controls.

## Verification

Command run:

- `npm run verify`

Final status: passes.

## Lessons Learned

Audit logs are not just debugging logs. They are durable accountability records and deserve their own access rules.

Compliance features often start as boring admin screens, but they teach a deep architecture habit: important actions should leave source records that can be inspected later.
