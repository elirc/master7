# API Errors And Logging Walkthrough

Files:

- `apps/api/src/errors.ts`
- `apps/api/src/logger.ts`

`errors.ts` maps known application failures into stable HTTP responses. This keeps routes thin and prevents service exceptions from becoming accidental unstructured 500s.

`logger.ts` writes structured JSON logs with a level, timestamp, message, and fields. Structured logs are easier to filter and correlate than free-form strings.

Important idea: production-style error handling and logging are not decoration. They are part of the API contract and part of how engineers debug real incidents.
