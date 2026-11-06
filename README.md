# luckgage v2

luckgage v2 combines an Expo mobile app, a self-hosted TypeScript REST API, PostgreSQL, and a React
admin app. **Phase 1D local mobile scope, backend Phase 2A–2D, and mobile integration Phase 3A are
complete.** Trip/checklist server integration (Phase 3B) and the admin web app have not started.

## Sources of truth

- [Full-stack product spec](PROJECT_SPEC_FULLSTACK_EDITION.md)
- [Classroom behavior baseline](PROJECT_SPEC_CLASSROOM_EDITION.md)
- [Migration documentation](docs/fullstack-migration/README.md)
- [Slink reference audit](docs/reference-slink-audit.md)

## Requirements

- Node.js 22.13 or newer (Expo SDK 58 requirement)
- npm 11 or a compatible npm version
- Docker-compatible runtime for local PostgreSQL

## Install and run

```bash
npm install
npm run mobile
```

From the Expo CLI, choose a supported Android or iOS target. Trips and their checklists persist in
the local SQLite database between app restarts.

The only mobile environment value is public. Copy `apps/mobile/.env.example` to
`apps/mobile/.env.local` and set `EXPO_PUBLIC_API_BASE_URL` to the API origin. The client normalizes
that origin to `/api/v1/`; use the development machine's LAN address for a physical device rather
than `127.0.0.1`.

To run the independent backend foundation:

```bash
cp apps/api/.env.example apps/api/.env
npm run db:up
npm run db:migrate
npm run db:seed
npm run api
```

The API exposes liveness at `/api/v1/health/live`, database/migration readiness at
`/api/v1/health/ready`, Swagger UI at `/openapi`, and JSON at `/openapi.json`. See
[`apps/api/README.md`](apps/api/README.md) for its commands and contracts.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run api:build
npm run openapi:check
npx expo-doctor@latest apps/mobile
git diff --check
```

The root uses npm workspaces so later phases can add real apps or packages without creating empty
placeholders now. Expo/native dependencies stay in `apps/mobile/package.json`.

## Current scope

`apps/mobile` contains Expo SDK 58, Expo Router, strict TypeScript, a safe-area app shell, semantic
light/dark tokens, system/light/dark preferences, Vietnamese/English preferences, development
error logging, an error boundary, and focused Jest tests. Preferences use the SQLite-backed
key-value store. Phase 3A adds localized welcome/register/login screens, authenticated route groups,
logout cleanup, restart recovery, and a typed API client. Refresh credentials are stored only in
Expo SecureStore, access tokens stay in memory, and concurrent 401 responses share one refresh.

The Trips slice includes calendar-date validation, UUID identifiers, a versioned SQLite schema,
a repository seam, timeline grouping, Trips Hub, three-step create/review, edit, detail, delete,
empty/loading/error states, and local restart persistence.

The Checklist slice adds category/item relations with cascading deletion, progress,
search, packed/unpacked filters, category and item CRUD, per-category bulk state, inline quick-add,
item quantity/notes, undo delete, completion feedback, and a one-tap entry from Trip Detail.

Phase 1D adds deterministic rule-based packing suggestions with editable preview, explicit
confirmation, and transactional append-only apply. Trip Detail includes an optional direct
Open-Meteo forecast with local cache/stale fallback and °C/°F preference. Local packing reminders
use `expo-notifications`, request permission only when enabled, and support one or three days before
departure. Notification behavior must be verified in a development build or on a physical device;
denied permission and weather failure never block trip or checklist flows.

The local schema is version 3: trips, checklist relations, weather cache, and reminder metadata.

`apps/api` provides the Phase 2A NestJS foundation: validated environment configuration,
PostgreSQL 17 Compose service, Prisma 7 migration/seed flow, versioned REST prefix, CORS and Helmet,
request IDs, structured request logs, stable problem responses, health/readiness, focused tests, and
a generated OpenAPI artifact. Phase 2B adds Argon2id passwords, mobile access/rotating refresh
sessions, reuse detection and revocation, current-profile endpoints, USER/ADMIN guards, rate limits,
secure admin cookie sessions with CSRF protection, and paginated admin user status management.
Phase 2C adds transactional trip ownership, member-scoped trip CRUD, hashed invite lifecycle and
idempotent join, member removal, shared checklist CRUD/bulk state, optimistic versioning, and
database-level cascade and integrity constraints.

Phase 2D adds versioned/published deterministic packing rules, read-only preview, transactional
append-only apply, localized published trip suggestions, and a normalized Open-Meteo proxy with
timeout/retry/cache/stale fallback. Weather remains optional: failures return `UNAVAILABLE` without
breaking trip or checklist flows. Rule and content administration endpoints are ready for the later
admin UI and are protected by the existing admin cookie, role, and CSRF policy.

Trips and checklists intentionally remain on the local repositories until Phase 3B. Join/invite,
conflict handling, server suggestions/weather adoption, the admin web app, and shared generated
clients are not implemented yet.
