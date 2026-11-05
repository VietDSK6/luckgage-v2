# luckgage v2

luckgage v2 will combine an Expo mobile app, a self-hosted TypeScript REST API, PostgreSQL, and a
React admin app. **Phase 1B Trips vertical slice is complete**; Phase 1C Checklist has not started.
Backend and admin have not been scaffolded.

## Sources of truth

- [Full-stack product spec](PROJECT_SPEC_FULLSTACK_EDITION.md)
- [Classroom behavior baseline](PROJECT_SPEC_CLASSROOM_EDITION.md)
- [Migration documentation](docs/fullstack-migration/README.md)
- [Slink reference audit](docs/reference-slink-audit.md)

## Requirements

- Node.js 22.13 or newer (Expo SDK 58 requirement)
- npm 11 or a compatible npm version

## Install and run

```bash
npm install
npm run mobile
```

From the Expo CLI, choose a supported Android or iOS target. Trips persist in the local SQLite
database between app restarts.

The only example environment value is public. Copy `apps/mobile/.env.example` to
`apps/mobile/.env.local` when a local API URL is needed later. No API client exists yet.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npx expo-doctor@latest apps/mobile
git diff --check
```

The root uses npm workspaces so later phases can add real apps or packages without creating empty
placeholders now. Expo/native dependencies stay in `apps/mobile/package.json`.

## Current scope

`apps/mobile` contains Expo SDK 58, Expo Router, strict TypeScript, a safe-area app shell, semantic
light/dark tokens, system/light/dark preferences, Vietnamese/English preferences, development
error logging, an error boundary, and focused Jest tests. Preferences use the SQLite-backed
key-value store.

The Trips slice includes calendar-date validation, UUID identifiers, a versioned SQLite schema,
a repository seam, timeline grouping, Trips Hub, three-step create/review, edit, detail, delete,
empty/loading/error states, and local restart persistence.

Checklist, Smart List, Auth, remote sync, API, admin, and shared packages are intentionally not
implemented in this phase.
