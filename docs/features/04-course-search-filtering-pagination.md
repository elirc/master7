# 04 - Course Search, Filtering, And Pagination

## Goal

Add realistic catalog querying so learners and admins can search published courses, filter by organization and status, and page through results.

## Impacted Codebase Areas

- `packages/contracts`
- `apps/api`
- `apps/web`
- Tests
- Docs

## Implementation Approach

Add a query schema for catalog requests. Implement a service method that enforces actor visibility, applies search/status/organization filters, and returns pagination metadata. Update the catalog endpoint and frontend dashboard to use queryable catalog data.

## Design Considerations

Filtering must happen after backend visibility rules are applied. A learner should not be able to query another tenant's catalog by guessing an organization ID. Pagination metadata should be explicit so clients can build reliable navigation.

## Build Journal

Implemented a typed catalog query schema with search text, status, organization ID, page, and page size. Added `services.catalog`, which first applies actor visibility and then applies caller filters. This ordering matters because tenant isolation is a backend rule, not a frontend convention.

The seeded catalog now has multiple published courses across two organizations so tenant filtering can be demonstrated. The web dashboard now has a catalog search field backed by the API. The API test proves an Acme learner cannot discover Nova's forklift course by searching for it.

Tradeoff: pagination is offset-style and in-memory for now. Production systems with large catalogs would likely use database indexes and possibly cursor pagination for high-volume browsing.

## Verification

Command run:

- `npm run verify`

Final status: passes.

## Lessons Learned

Search and filtering are security-sensitive when tenants exist. A query parameter should never widen access beyond what the actor can already see.

Pagination metadata is part of the API contract. Clients should not infer totals or page counts from array length alone.
