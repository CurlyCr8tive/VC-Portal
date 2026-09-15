# VC-Portal IDE Transition Prompt

Paste everything below as the first message to the next coding assistant, opened at the root of this repo:

`/Users/chericeheron/Desktop/VC Dashboard`

---

I am continuing work on the Verified Consulting PR portal.

Important: this project is only Verified Consulting. Do not use FEF context.

## Project Shape

- Static frontend: root HTML files plus vanilla JavaScript modules in `src/`.
- Owner portal: `owner.html`, `src/owner/app.js`, `src/owner/components/`.
- Client portal: `client.html`, `src/client/app.js`, `src/client/components/`.
- Owner API: `server/owner-api`, default local port `4001`.
- Client API: `server/client-api`, default local port `4002`.
- Static server: `npm run serve:static`, default local port `8420`.
- Build/health check: `npm run check`.

The app intentionally keeps a localStorage fallback for demo/local work. Do not remove that fallback while wiring Supabase features. Real API mode is gated by the existing `shouldUseOwnerApi()` / real Supabase session pattern.

## Current Git State At Handoff

Recent local commits:

- `30fd811 Fix owner dashboard compact table visibility`
- `6d04dbe Wire owner coaching UI to Supabase`
- `2a36c4e Add Supabase coaching API slice`
- `1a39b4b Checkpoint VC portal owner and client workflows`

Before making changes, run:

```sh
git status --short --branch
git log --oneline origin/main..HEAD
npm run check
```

Expected state immediately after this handoff is either clean and synced, or clean with only this handoff file if it has not been committed/pushed yet. Do not rely on older notes saying coaching is half-finished; that is stale.

## What Was Just Completed

Client coaching Supabase slice:

- Client portal loads coaching phases, homework, opportunities, resources, and checklist/files from `/api/coaching`.
- Client homework and reflection updates save through the client API.
- Client-submitted opportunities save to Supabase for Tenyse to review.

Owner coaching Supabase wiring:

- Owner API routes exist for coaching phases, homework, opportunities, and resources.
- Owner Coaching Program UI is wired to Supabase in real owner sessions:
  - Phase Tracker
  - Homework/action items
  - Opportunity Evaluator
  - Resources & Checklist
- Owner dashboard coaching overview can read real coaching data.

Dashboard visual QA fix:

- `portal-styles.css` now keeps compact owner dashboard tables visible at smaller widths.
- `owner.html` stylesheet cache-buster was bumped so the fix actually loads.
- This fixed the issue where Coaching Program Overview had real row data in the DOM but appeared blank/collapsed.

Verification already run:

```sh
npm run check
```

It passed.

## Known Notes

- `HANDOFF.md` was previously stale and said Opportunity Evaluator and Resource Library were not wired. That is no longer true after commit `6d04dbe`.
- Do not print or expose service-role keys.
- Supabase schema and env state should be verified before assuming the live project has every local table/policy.
- Google Workspace/Gmail/Calendar integration exists as backend scaffolding and status UI, but it still needs real credential/config validation before claiming it is production-ready.
- AVE calculation should not invent values. The standing rule is to surface missing rate data instead of guessing.

## Next Work

1. Push any local commits if they are still ahead of `origin/main`.
2. Visually QA the owner portal at:
   `http://localhost:8420/owner.html`
3. Test owner coaching end to end:
   - Select a coaching client.
   - Load a program template.
   - Edit a phase.
   - Add homework.
   - Change homework status.
   - Add/edit/delete an opportunity.
   - Add/edit/delete a resource/checklist item.
4. Test the client portal sees owner-created coaching updates.
5. Continue validating real Supabase flows:
   - Owner login.
   - Client login.
   - Invite flow.
   - Placements.
   - AVE/publicity value.
   - Lead time.
   - Google Workspace/Gmail/Calendar status.

## Working Rules

- Read the repo before changing code.
- Do not mix in FEF context.
- Preserve existing localStorage fallback patterns.
- Use existing vanilla JS/component patterns.
- Run `npm run check` after changes.
- Commit clean checkpoints.
- Ask before destructive git operations or force-pushes.
