# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Status and sources of truth

The README's opening paragraph records which phases are complete; check it before starting work so
you stay inside the current phase. When code, spec, and docs conflict, the precedence is:
`PROJECT_SPEC_FULLSTACK_EDITION.md` → `docs/fullstack-migration/*` (mostly Vietnamese; index in its
`README.md`) → existing luckgage-v2 code → legacy Compose repo (`../luckgage`, behavior only) →
`slink-app-base` (patterns only). Stop and record a decision instead of silently picking one.

The `unslop-design` skill lives at `.agents/skills/unslop-design/SKILL.md` (not `.claude/skills`),
so read it directly; the rules are in `.agents/rules/unslop-design.md`. Mobile UI copy is bilingual
(vi/en) and must carry the same meaning in both.

## Commands

npm workspaces, Node ≥ 22.13. Run from the repo root unless noted.

```bash
npm install
npm run db:up                 # Postgres 17 via compose.yaml, host port 5433
cp apps/api/.env.example apps/api/.env
npm run db:migrate && npm run db:seed
npm run api                   # NestJS on :3000 (tsc --watch + node --watch, see below)
npm run admin                 # Vite on :5173 (needs apps/admin/.env.local)
npm run mobile                # Expo (needs apps/mobile/.env.local with EXPO_PUBLIC_API_BASE_URL)
```

Checks (CI in `.github/workflows/ci.yml` runs all of these plus a double seed and
`npx expo export --platform android` in `apps/mobile`):

```bash
npm run typecheck
npm run lint                  # api/admin use --max-warnings=0
npm test
npm run openapi:check         # fails if apps/api/openapi/openapi.json is stale
npm run api:build
npm run admin:build
git diff --check
```

Single tests (append `-t "<name>"` to filter by test name):

```bash
npm run test --workspace @luckgage/api -- src/trips/trip-presentation.spec.ts
npm run test --workspace @luckgage/admin -- src/api/ApiClient.test.ts
npm run test --workspace @luckgage/mobile -- src/features/checklist/domain/checklist.test.ts
```

- API unit tests: Vitest, `src/**/*.spec.ts` and `test/**/*.spec.ts`; `test/setup.ts` supplies
  env defaults. Integration tests (`test/integration/*.ts`, `npm run test:integration --workspace
  @luckgage/api`) refuse to run unless `DATABASE_URL` names a database ending in `_integration`,
  need migrations applied there first, and wipe app records.
- Admin: Vitest + jsdom + Testing Library (`*.test.ts(x)`). Mobile: Jest (`jest-expo`) +
  React Native Testing Library, `__tests__/` and colocated `*.test.ts(x)`.
- After changing controllers or DTOs: `npm run openapi:generate` and commit the JSON.
- After changing `apps/api/prisma/schema.prisma`: `npm run db:migrate:dev --workspace
  @luckgage/api` to create a migration, then `npm run prisma:generate --workspace @luckgage/api`.
- `npm run perf:smoke` and `bash scripts/verify-demo-backup.sh luckgage_integration` are Phase 5
  local checks; the backup script refuses the ordinary `luckgage` database.

## Architecture

Three apps, no shared packages: `apps/mobile` (Expo SDK 58 / Expo Router / React Native),
`apps/api` (NestJS modular monolith + Prisma 7 + PostgreSQL), `apps/admin` (Vite + React +
TanStack Query + React Router). Mobile and admin each keep their own hand-written typed API client
and DTO types; `apps/api/openapi/openapi.json` is the contract between them.

### API (`apps/api`)

- ESM (`"type": "module"`): relative imports in `src` use `.js` suffixes.
- Nest relies on emitted decorator metadata for DTO validation, so `start:dev`
  (`scripts/start-dev.ts`) compiles with `tsc --watch` and runs `dist/main.js` rather than running
  TS through an esbuild loader. Don't switch it to `tsx` for the app.
- `bootstrap.ts#configureApplication` is shared by `main.ts`, e2e tests, and OpenAPI generation: it
  sets the `api/v1` prefix, Helmet, CORS (`ALLOWED_ORIGINS`), a whitelist `ValidationPipe` that
  returns 422 with `fieldErrors`, and `HttpExceptionFilter`. Every error is a problem object
  `{ status, code, title, detail, requestId, fieldErrors? }`.
- Env is validated with Zod in `src/config/environment.ts` at `ConfigModule` load.
- One folder per feature module (`auth`, `users`, `trips` + `memberships`, `checklists`,
  `packing-suggestions`, `trip-suggestions`, `guides`, `weather`, `admin-dashboard`, `health`),
  each with module/controller/service/dto. Pure logic is split out for unit tests (e.g.
  `packing-engine.ts`, `checklist-progress.ts`, `trip-presentation.ts`, `common/calendar-date.ts`).
- Two auth schemes: mobile uses short-lived JWT access tokens + rotating hashed refresh tokens
  (reuse revokes the family); admin uses an opaque HttpOnly SameSite cookie plus an
  `x-csrf-token` header on state-changing calls. Guards/decorators are in `src/auth`.
- Trip, category, and item edits use optimistic `version` fields; clients must send the version and
  handle conflicts. Invite codes are stored only as SHA-256 hashes; join is idempotent.
- Packing rules are versioned; a published revision is immutable (editing creates a new draft).
  Preview never writes; apply appends a user-confirmed snapshot in one transaction and never
  overwrites existing items.
- Weather proxies Open-Meteo with timeout/retry/cache/stale fallback and returns `UNAVAILABLE`
  instead of failing; weather calls happen outside packing-apply transactions.
- `prisma/seed.ts` is idempotent and creates demo users/content; it refuses production or remote
  databases without `ALLOW_DEMO_SEED=true`. Admin bootstrap uses `SEED_ADMIN_EMAIL/PASSWORD`.

### Mobile (`apps/mobile`)

- `app/` holds thin Expo Router route files that read params and render a screen from
  `src/features/*`. Groups: `(auth)` (welcome/sign-in/sign-up) and `(app)` (redirects to
  `/welcome` when unauthenticated), with `(app)/(tabs)` for Trips/Settings and trip flows in the
  parent Stack.
- `@/` maps to `src/`. Layout: `data/remote` (ApiClient), `data/repositories`, `features/*`
  (screens + `domain/` pure logic), `design` (tokens, theme, components, feedback), `i18n`,
  `platform` (preferences, secure storage, notifications, logging, error boundary).
- Data access pattern: each domain has a `XRepository` interface, a `RemoteXRepository` built on
  the ApiClient, and an `XRepositoryProvider` context with a `useXRepository()` hook. All providers
  are composed in `src/platform/AppProviders.tsx`; add new ones there. Screens use the hooks, never
  the ApiClient directly.
- Server is the only source of truth for trips, checklists, packing suggestions, weather, and
  guides. `expo-sqlite` is used only as a key-value store for preferences and local reminder
  metadata; do not reintroduce local trip/checklist persistence.
- The ApiClient normalizes `EXPO_PUBLIC_API_BASE_URL` to `/api/v1/`, keeps the access token in
  memory, stores refresh credentials only in SecureStore, and shares one refresh across concurrent
  401s. Dev logs redact passwords and tokens.
- Strings live in `src/i18n/messages.ts` (`vi` and `en` objects with identical keys), consumed via
  `useI18n()`. Colors/spacing/radii come from `src/design/tokens`; icons go through the Lucide
  wrapper in `src/design/components/AppIcon.tsx`. Brand rules are in `docs/BRAND_SYSTEM.md`.

### Admin (`apps/admin`)

- `src/app` holds the shell, routing, and `AdminAuthProvider` (cookie-session restore; CSRF token
  kept in memory only). `src/api/*Api.ts` wrap `ApiClient.ts`, which attaches `x-csrf-token` and
  normalizes problem responses. `src/features/*` contains pages; form logic is split into
  testable `*Form.ts` / `*Presentation.ts` files. List filters are URL-backed.
- `VITE_API_BASE_URL` is embedded at build time.

### Deployment

`deploy/vps/` holds a Compose demo deployment (API + admin + Postgres) for a shared VPS; its README
(Vietnamese) covers secrets, build order, and verification. Mobile builds for it must set
`EXPO_PUBLIC_API_BASE_URL` to the deployed API.
