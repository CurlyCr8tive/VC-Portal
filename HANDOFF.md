# Verified Consulting PR Platform Handoff

_Last updated: October 1, 2026._

This repository contains the Verified Consulting PR Platform: a browser frontend, an owner API, a client API, and Supabase-backed auth/data flows.

## Start Here

Use [docs/handoff-index-2026-10-01.md](docs/handoff-index-2026-10-01.md) as the handoff table of contents.

The shortest path for today:

1. Read the handoff index.
2. Run local deploy-safe checks.
3. Deploy the Render Blueprint.
4. Add production environment variables.
5. Run the deployed owner/client/pilot invite tests.
6. Share the owner/client use guides and the technical handoff.

## Current Deployment Position

Recommended deployment path:

- **Render Blueprint** using `render.yaml`
- `vc-portal-frontend`
- `vc-portal-owner-api`
- `vc-portal-client-api`

Local checks that should pass before deployment:

```bash
npm run check
npm run build:frontend
```

Optional local runtime check:

```bash
npm run start:local
```

Then, in another terminal:

```bash
npm run handoff:check-real
npm run test:local-user-flow
```

## Handoff Accounts

Owner/admin accounts prepared for testing:

- `tenyse@verifiedconsulting.com`
- `jessicadorismond@gmail.com`

Internal client test account:

- `ChericeHeron@gmail.com`
- Scoped to `Greyz Bistro`

Pilot invite target:

- `TheEsmereldaCo@gmail.com`
- Scope target: `Greyz Bistro`

Do not put passwords, Supabase service-role keys, or Google OAuth secrets in this repo or in handoff docs.

## Known Launch Gate

The app is deploy-prepared, but final production readiness requires deployed QA:

- deployed frontend URL
- deployed owner API URL
- deployed client API URL
- production env vars
- real owner/admin login test
- Greyz Bistro pilot invite/password setup test
- client scoping test
- notification decision: configure Gmail OAuth now, or mark Gmail notifications Phase 2
