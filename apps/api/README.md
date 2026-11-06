# luckgage API

NestJS modular-monolith API for luckgage. Backend Phase 2A–2D is implemented: infrastructure,
Auth/Users, Trips/Memberships/Checklists, deterministic packing suggestions, published trip
suggestions, and optional Open-Meteo weather.

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
- `/api/v1/trips` provides member-scoped trip CRUD with owner-only mutations.
- `/api/v1/trips/:tripId/members|invites` and `/api/v1/trip-invites/*` provide collaboration.
- `/api/v1/trips/:tripId/checklist`, `/api/v1/checklist-categories/*`, and
  `/api/v1/checklist-items/*` provide shared checklist CRUD and category bulk state.
- `POST /api/v1/trips/:tripId/packing-suggestions/preview|apply` previews published deterministic
  rules, then atomically appends only the user-confirmed snapshot.
- `GET /api/v1/locations/search` and `GET /api/v1/trips/:tripId/weather` proxy normalized
  Open-Meteo data with timeout, retry, cache, stale fallback, and a non-blocking `UNAVAILABLE`
  state.
- `GET /api/v1/trip-suggestions[/:slug]` exposes published localized destination content.
- `/api/v1/admin/packing-rules/*` and `/api/v1/admin/trip-suggestions/*` provide cookie/CSRF
  protected draft, preview, publish, and archive workflows.
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

Invite codes are random, returned raw only when created, and persisted only as SHA-256 hashes. Join
is idempotent for an existing active member and uses a serializable transaction for membership,
usage limits, and reactivation. Trip creation atomically creates its owner membership. Trip,
category, and item edits use optimistic versions; PostgreSQL cascades dependent trip data.

Packing rules use a deliberately finite condition schema. All non-null conditions inside one rule
are ANDed; matching rules are merged deterministically by stable category/item keys. A published
revision is immutable: editing it creates the next draft version. Preview never writes checklist
data, while apply permits user edits and duplicate names but never overwrites existing items.

Weather configuration is public service configuration, not a secret. `OPEN_METEO_BASE_URL`,
`OPEN_METEO_GEOCODING_BASE_URL`, `OPEN_METEO_TIMEOUT_MS`, and `WEATHER_CACHE_TTL_MINUTES` have safe
defaults in `.env.example`. Weather calls are made before packing apply transactions and cannot make
trip or checklist endpoints fail.

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
