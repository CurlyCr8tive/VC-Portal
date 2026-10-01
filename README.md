# VC-Portal
Dashboard portal for Verified Consulting — a PR and brand-marketing agency
founded by Tenyse Williams, whose past work spans food & beverage, aviation,
health tech, and non-profit clients, with coverage in Forbes, Essence, BET,
NBC, and Black Enterprise among others. This context matters for how
features in this repo should behave: e.g. any AI-writing agent (executive
summaries, AVE estimates) should be calibrated against her real case-study
voice and numbers, not generic PR boilerplate — see `docs/agent-notes.md`
for the reference data and specifics.

## Handoff Docs

Start with:

- [Handoff Index](docs/handoff-index-2026-10-01.md)
- [Render Deployment Checklist](docs/render-deployment-checklist.md)
- [Technical Handoff](docs/technical-handoff.md)

## Build Shape

This repo is intentionally lightweight:

- Browser pages live at the repo root and import ES modules from `src/`.
- The owner API lives in `server/owner-api`.
- The client API lives in `server/client-api`.
- The deploy build copies browser-safe files into `dist` with `npm run build:frontend`.
- The current "check" command is syntax + package sanity.

## Local Setup

Install the API dependencies:

```sh
npm run install:apis
```

Run the build check:

```sh
npm run check
```

Run the local browser frontend and both APIs:

```sh
npm run start:local
```

Then open:

- `http://localhost:8420/login.html`

The APIs expose `/health`, but protected routes require each service to have a
`.env` copied from its `.env.example` with real Supabase values.

Build the deployable browser frontend:

```sh
npm run build:frontend
```

Live-only features such as client invites, Discovery scans, AI writing
helpers, AVE rate research, Google Workspace, and live saves have their own
activation requirements. Track those in
[`docs/live-feature-activation-plan.md`](docs/live-feature-activation-plan.md)
so "built in the repo" does not get confused with "connected to live accounts."

## Client Onboarding

Tenyse should manage clients from the owner portal, not from Supabase. The
handoff workflow is documented in
[`docs/client-onboarding.md`](docs/client-onboarding.md).
