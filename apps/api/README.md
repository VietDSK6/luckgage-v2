# luckgage API

NestJS modular-monolith API for luckgage. Phase 2A infrastructure and Phase 2B Auth/Users are
implemented; Trips, Memberships, Checklists, and suggestion modules remain later Phase 2 slices.

## Local setup

From the repository root:

```bash
cp apps/api/.env.example apps/api/.env
npm run db:up
npm run db:migrate
npm run db:seed
npm run api
```

To bootstrap the first local admin, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` only in the
ignored `apps/api/.env`, then run `npm run db:seed`. The seed creates a missing admin but never
overwrites credentials for an existing account.

The API listens on `http://localhost:3000` by default:

- `GET /api/v1/health/live` checks the process.
- `GET /api/v1/health/ready` checks PostgreSQL and Prisma migration state.
- `POST /api/v1/auth/register|login|refresh|logout` manages mobile bearer sessions.
- `GET|PATCH /api/v1/me` reads or updates the current profile.
- `POST /api/v1/admin/auth/login|logout` and `GET /api/v1/admin/auth/me` manage admin cookies.
- `GET /api/v1/admin/users` and `GET|PATCH /api/v1/admin/users/:userId[/status]` manage users.
- `/openapi` serves Swagger UI.
- `/openapi.json` serves the runtime OpenAPI document.

Stop local PostgreSQL with `npm run db:down`. The named volume is retained.

## Contracts and checks

All API errors use `{ status, code, title, detail, requestId, fieldErrors? }`. Incoming safe
`x-request-id` values are propagated; otherwise the API generates one. Request logs contain
method, route, status, duration, and request ID, never request bodies.

Passwords use Argon2id. Mobile access tokens are short-lived JWTs; random refresh tokens are stored
only as SHA-256 hashes, rotate on use, and revoke their session family on reuse. Admin sessions use
an opaque HttpOnly, SameSite cookie; state-changing admin calls also require `x-csrf-token`.
Authentication attempts are limited by both IP and a hashed identifier in the current single-process
modular monolith. A shared limiter store is deferred until horizontal scaling is introduced.

```bash
npm run typecheck --workspace @luckgage/api
npm run lint --workspace @luckgage/api
npm run test --workspace @luckgage/api
npm run test:integration --workspace @luckgage/api
npm run api:build
npm run openapi:generate
npm run openapi:check
```

`apps/api/openapi/openapi.json` is the version-controlled contract artifact. Regenerate it whenever
controllers or DTOs change.

Database integration tests intentionally refuse to run unless the database name ends in
`_integration`; they clear Auth/Users records in that isolated database.
