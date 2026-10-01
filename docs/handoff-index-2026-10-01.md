# PR Platform Handoff Index

_Date: October 1, 2026_

This is the source-of-truth index for today's PR Platform handoff. It separates documents that should be shared with Tenyse/Jessica from technical/admin docs that should stay with the developer or account owner.

## Handoff Status

The build is **deploy-prepared**, not fully production-cleared until deployed QA is complete.

Ready:

- Browser frontend build command exists: `npm run build:frontend`
- Render Blueprint exists: `render.yaml`
- Owner API and client API are defined as separate services
- Supabase real auth path exists
- Demo auth is disabled in production-mode config
- Greyz Bistro pilot invite path is prepared
- Local deploy-safe checks exist

Still required:

- Deploy Render services
- Add production env vars in Render
- Redeploy after service URLs are known
- Test deployed owner/admin login
- Send pilot invite to `TheEsmereldaCo@gmail.com`
- Confirm invite/password setup and client scoping
- Configure Gmail OAuth notifications or mark notifications Phase 2

## Share With Tenyse / Jessica

Use these for user-facing handoff and testing.

| Document | Purpose |
| --- | --- |
| [Tenyse Use Guide](tenyse-use-guide.md) | Founder-facing guide for using the PR platform and understanding the workflows. |
| [Final Client Handoff Email And Doc](final-client-handoff-email-and-doc.md) | Client-facing email draft and Google Doc copy for the final handoff. |
| [Client Onboarding](client-onboarding.md) | How client invites/password setup should work. |
| [Local User Test](local-user-test.md) | Local testing steps before deployed URLs exist. |
| [Render Deployment Checklist](render-deployment-checklist.md) | Step-by-step Render deployment and env var checklist. |
| [Deploy And Handoff Plan](deploy-and-handoff-plan.md) | Overall deploy/test/final handoff plan. |

## Developer / Technical Handoff

Use these for whoever maintains or deploys the app.

| Document | Purpose |
| --- | --- |
| [Technical Handoff](technical-handoff.md) | Repo shape, commands, Supabase/API/deployment notes. |
| [Deployment Runtime Config](deployment-runtime-config.md) | How frontend/API URLs are configured. |
| [Real Account Handoff Test Plan](real-account-handoff-test-plan.md) | Real account and invite test procedure. |
| [Security Hardening Phase 1](security-hardening-phase-1.md) | Security changes already implemented and what remains. |
| [CTA Link QA Protocol](cta-link-qa-protocol.md) | Button/link functionality QA protocol for future UI changes. |

## Agent / Product Reference

Use these when explaining or extending the AI/agent system.

| Document | Purpose |
| --- | --- |
| [Agent Build Discussion Summary](agent-build-discussion-summary.md) | Q&A summary about how the agents were built. |
| [Agent Learning Next Steps](agent-learning-next-steps.md) | Proposed memory/learning improvements. |
| [Agent Notes](agent-notes.md) | Case-study source notes and AVE context. |
| [AVE Agent Details](ave-agent-details.md) | AVE calculation details and caveats. |
| [AVE Calculation Agent](agents/ave-calculation-agent.md) | Specific AVE agent behavior. |
| [Executive Summary Agent](agents/executive-summary-agent.md) | Specific executive summary agent behavior. |

## Deployment Day Checklist

1. Confirm repo is clean:

   ```bash
   git status --short
   ```

2. Confirm local build:

   ```bash
   npm run check
   npm run build:frontend
   ```

3. Create Render Blueprint from GitHub repo:

   ```text
   CurlyCr8tive/VC-Portal
   ```

4. Add Render env vars from [Render Deployment Checklist](render-deployment-checklist.md).

5. Redeploy in this order:

   ```text
   owner API
   client API
   frontend
   ```

6. Test API health:

   ```text
   <owner-api-url>/health
   <client-api-url>/health
   ```

7. Test deployed app:

   - Tenyse owner login
   - Jessica owner/admin login
   - Greyz Bistro pilot invite to `TheEsmereldaCo@gmail.com`
   - Pilot password setup
   - Pilot client login
   - Greyz-only client scoping
   - reports/coaching/notes/messages/files

8. Record known limitations:

   - Gmail notifications are launch-ready only after Google OAuth env vars are configured.
   - Optional discovery/LLM/search features need provider keys in the owner API env vars.

## What Not To Share In Public Docs

Do not include:

- Supabase service-role key
- user passwords
- Google OAuth client secret
- Google refresh token
- OpenAI/Anthropic/Perplexity/search API keys

Share secrets only through Render env vars, Supabase dashboard access, or a private password manager.
