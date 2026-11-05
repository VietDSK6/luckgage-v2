# luckgage v2 repository guidance

luckgage v2 is a full-stack travel packing product. The target stack is Expo + React Native +
TypeScript for mobile, a TypeScript modular-monolith API, and a separate React admin app.

Before changing behavior, read `PROJECT_SPEC_FULLSTACK_EDITION.md` and the relevant files under
`docs/fullstack-migration/`. Use `PROJECT_SPEC_CLASSROOM_EDITION.md` and the legacy Compose app only
as behavior baselines. Use `/Users/macbook/Documents/Projects/Apps/slink-app-base` only as a
read-only implementation reference; record ADOPT/ADAPT/REJECT decisions in
`docs/reference-slink-audit.md`.

Implement phases in order: Expo mobile local, backend, mobile/backend integration, admin, then
hardening. Do not begin a later phase to fill gaps in the current one.

- Keep TypeScript strict and route files thin; put feature implementation under `src`.
- Port product behavior, not Compose UI or Android-specific architecture 1:1.
- Checklist is the source of truth. Smart List must preview, allow edits, require confirmation,
  and append without silently overwriting existing items.
- Weather is optional and must never block trip or checklist flows.
- Do not add dependencies, layers, shared packages, or generic abstractions without current use.
- Treat every mobile build-time environment value as public; never commit secrets.
- Verify the smallest relevant checks, then run `git diff --check` and inspect `git status`.
- Update durable documentation when architecture, commands, scope, or product behavior changes.
