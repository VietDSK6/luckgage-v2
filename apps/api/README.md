# luckgage API

NestJS modular-monolith API foundation for luckgage. Phase 2A intentionally contains only
cross-cutting infrastructure; Auth/Users and all product modules begin in later Phase 2 slices.

## Local setup

From the repository root:

```bash
cp apps/api/.env.example apps/api/.env
npm run db:up
npm run db:migrate
npm run db:seed
npm run api
```

The API listens on `http://localhost:3000` by default:

- `GET /api/v1/health/live` checks the process.
- `GET /api/v1/health/ready` checks PostgreSQL and Prisma migration state.
- `/openapi` serves Swagger UI.
- `/openapi.json` serves the runtime OpenAPI document.

Stop local PostgreSQL with `npm run db:down`. The named volume is retained.

## Contracts and checks

All API errors use `{ status, code, title, detail, requestId, fieldErrors? }`. Incoming safe
`x-request-id` values are propagated; otherwise the API generates one. Request logs contain
method, route, status, duration, and request ID, never request bodies.

```bash
npm run typecheck --workspace @luckgage/api
npm run lint --workspace @luckgage/api
npm run test --workspace @luckgage/api
npm run api:build
npm run openapi:generate
npm run openapi:check
```

`apps/api/openapi/openapi.json` is the version-controlled contract artifact. Regenerate it whenever
controllers or DTOs change.
