# VC-Portal
Dashboard portal for Verified Consulting — a PR and brand-marketing agency
founded by Tenyse Williams, whose past work spans food & beverage, aviation,
health tech, and non-profit clients, with coverage in Forbes, Essence, BET,
NBC, and Black Enterprise among others. This context matters for how
features in this repo should behave: e.g. any AI-writing agent (executive
summaries, AVE estimates) should be calibrated against her real case-study
voice and numbers, not generic PR boilerplate — see `docs/agent-notes.md`
for the reference data and specifics.

## Build Shape

This repo is intentionally lightweight:

- Static browser pages live at the repo root and import ES modules from `src/`.
- The owner API lives in `server/owner-api`.
- The client API lives in `server/client-api`.
- There is no bundler step yet; the current "build" check is syntax + package sanity.

## Local Setup

Install the API dependencies:

```sh
npm run install:apis
```

Run the build check:

```sh
npm run check
```

Serve the static portal:

```sh
npm run serve:static
```

Then open:

- `http://localhost:8420/login.html`
- `http://localhost:8420/owner.html`
- `http://localhost:8420/client.html`

Run the APIs in separate terminals when you need real Supabase-backed routes:

```sh
npm run start:owner-api
npm run start:client-api
```

The APIs start without Supabase credentials and expose `/health`, but protected
routes return `503` until each service has a `.env` copied from its
`.env.example` with real Supabase values.
