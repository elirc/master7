# API Store Walkthrough

File: `apps/api/src/store.ts`

This file holds feature-01 seed data and in-memory record collections. It acts like a temporary repository layer.

The store includes seeded organizations, demo users, a published course, modules, lessons, a published version, an enrollment, progress records, a quiz, an assignment, certificates, and audit logs.

The `audit` helper is called by services whenever an important action occurs. A production version would move this behind a repository and write to Postgres in the same transaction as the business change.

Change carefully: service tests and the frontend assume these demo IDs exist.
