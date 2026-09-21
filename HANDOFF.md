# Verified Consulting Handoff

_Last updated: September 20, 2026._

This repo contains the Verified Consulting PR Platform demo build and local API services.

Use these two documents for handoff:

- [Tenyse Use Guide](docs/tenyse-use-guide.md): founder-facing walkthrough for logging in, running the demo, viewing reports, reviewing messages, using coaching, and presenting the PR Platform alongside Raise Local.
- [Technical Handoff](docs/technical-handoff.md): developer-facing setup notes for the repo, local servers, Supabase, environment variables, current demo constraints, and post-demo work.

## Current Demo Position

- The PR Platform demo should focus on the report organization workflow.
- Coaching should be shown through Greyz Bistro/Chef Garth as the enrolled coaching client.
- PR-only clients now have a request path for coaching interest.
- Google/Gmail/Calendar auth is intentionally deferred until after demo day.
- Lead time and missing data use demo/mock values where needed.
- Raise Local is presented as the natural evolution of the relationship-building system.

## Latest Checkpoint

Latest pushed commit at this handoff:

```sh
06ae457 Polish demo flows and coaching request path
```

Before continuing development:

```sh
git status --short --branch
npm run check
```
