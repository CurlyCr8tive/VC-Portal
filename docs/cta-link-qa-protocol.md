# CTA and Link QA Protocol

Use this protocol before calling a page or feature finished. It is written to paste into an IDE chat, coding agent, or terminal-driven QA task.

## Prompt

Audit every visible CTA, button, link, tab, menu item, icon button, card that looks clickable, table action, form submit, quick action, and navigation item in this build.

For each page or route:

1. List every visible interactive element by exact label.
2. State what it is supposed to do.
3. Click or trigger it.
4. Record the result as one of:
   - Working: completes the expected action.
   - Working with feedback: action cannot complete yet, but the UI explains why and gives a next step.
   - Broken: no response, wrong destination, JavaScript error, stale/empty panel, fake popup, or misleading label.
   - Hidden/removed: action is not shown because it is not ready or not allowed.
5. For every Broken item, patch it before moving on.
6. For every button that cannot complete live behavior, either:
   - wire it to real demo-safe feedback,
   - rename it to clearly say Preview/Workflow,
   - show a useful next-step panel,
   - or remove it from the visible UI.
7. Re-run the audit after patching.

## Rules

- No decorative CTAs.
- No static disabled buttons.
- No clickable card or KPI may open a random tooltip only.
- No “View” button should go somewhere vague; it must open detail, a drawer, a page, or a clearly filtered view.
- No “Download” button should behave like “View.” If a file is not ready, say so inline.
- No “Import” button should imply data is being imported unless it accepts a file or clearly says workflow preview.
- No empty state should be blank if demo data can explain the workflow.
- Every async action must show loading, success, and failure feedback.
- Every live-only action must have a demo-safe fallback or be hidden.

## Output Format

Create a table:

| Page | Element | Expected Behavior | Actual Result | Status | Fix |
| --- | --- | --- | --- | --- | --- |

Then provide:

- A list of patched files.
- Remaining known limitations.
- The exact test commands run.
- Screenshots or browser notes for the highest-risk pages.

## Minimum Test Set

- Owner Dashboard
- Clients
- Campaigns
- Coaching Program
- Press Placements
- Review Queue
- Reports
- Analytics
- Settings
- Client Dashboard
- Client Reports
- Client Coaching Program
- Client Campaign Detail

## Pass Criteria

The build is not done until:

- No visible button is inert.
- No visible button lies about what it does.
- No static disabled button remains.
- All quick actions provide either an actual workflow or a clear preview workflow.
- All “View” buttons open meaningful detail.
- All “Download” buttons download or clearly explain why not.
- `npm run check` passes.
- `git diff --check` passes.
