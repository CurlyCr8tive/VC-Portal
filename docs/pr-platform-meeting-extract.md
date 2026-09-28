# PR Platform Meeting Extract

Source: Demo Day recap / handoff meeting notes.

Scope: **PR platform / VC Portal only**. Raise Local, Grove Park, Google Places, nonprofit/business matching, and the YES Academy/Sofia & Grace demo flow are out of scope for this document.

## Relevant Decisions

### Handoff Timeline

- Full handoff deadline: **September 30, 2026**.
- Live-account cleanup should happen before deployment testing.
- Jessica and Tenyse should receive login details after deployment.
- Jessica and Tenyse will test the ideal PR platform user flow and flag issues.
- All final PR platform changes should be completed by end of day Tuesday before the September 30 handoff.

### Repository Access

- PR platform repo is currently named **VC Portal**.
- Repo access is through GitHub.
- GitHub account is required to clone; a free GitHub account is enough.
- ZIP file sharing is unreliable because Google/Gmail security blocked it.
- Jessica should attempt access directly through GitHub.
- If GitHub access fails, resolve it through collaborator access or a public repo link, not ZIP/email attachment sharing.
- The repo may still include older mock/demo records until the cleanup branch/deploy is complete, so testers should use the deployed live-candidate URL as the source of truth for handoff testing.

### Mock Data / Live Data

For the PR platform:

- Remove or quarantine mock/demo data from live testing flows.
- Replace with real accounts and vetted real records.
- Keep mock data only as isolated developer/demo fallback data, not in the live handoff path.
- Real users should not be invited into mock accounts.

Raise Local exception:

- The meeting's preserved mock flow for YES Academy, Sofia & Grace Cookies, and related nonprofit/business matching belongs to Raise Local only. It should not drive PR platform data decisions.

### Real Accounts And Notifications

The PR platform must validate:

- real owner/admin login
- real client invite email
- real client password setup
- real client login
- notification email delivery
- notification delivery to Tenyse
- notification delivery to Jessica if she is part of the testing/handoff alert loop

Previous notification testing showed Tenyse did not receive an email, so end-to-end notification delivery is a priority before handoff.

During testing, Tenyse and Jessica may receive test invite, confirmation, or notification emails. Those messages are expected while the handoff team validates email confirmation, password setup, and owner notification delivery.

## PR Platform Next Steps

1. Remove or quarantine mock PR platform data from live testing.
2. Create/confirm real owner/admin access for Tenyse.
3. Create/confirm Jessica's testing access if she needs owner/admin review.
4. Configure deployed frontend and API URLs.
5. Set production env vars:
   - `NODE_ENV=production`
   - `ALLOW_LOCAL_DEMO_AUTH=false`
   - `APP_BASE_URL=<deployed frontend URL>`
   - `CORS_ALLOWED_ORIGINS=<deployed frontend URL>`
6. Confirm Supabase Auth uses real accounts.
7. Send one real client invite and complete password setup.
8. Configure Gmail/Google notification env vars.
9. Send notification test emails to Tenyse and Jessica, if applicable.
10. Give Jessica and Tenyse login details for testing.
11. Collect issues from their ideal-flow testing.
12. Finalize changes by end of day Tuesday.
13. Complete final handoff by September 30.

## Testing Focus For Jessica And Tenyse

- Can they log in?
- Is the owner dashboard usable with real data?
- Can a client be invited?
- Does the client password setup work?
- Can a client log in after setting a password?
- Does the client only see their own data?
- Are reports visible only when approved/published?
- Do notes/messages trigger notifications?
- Do exports/downloads work or clearly explain what is missing?
- Are any demo/mock labels or records still visible in live mode?

## Do Not Pull Into PR Platform Scope

- Raise Local deployment details.
- Grove Park October 6 presentation prep.
- Google Places API integration.
- Tier 1 / Tier 2 business matching model.
- Atlanta business research.
- YES Academy / Sofia & Grace demo matching flow.
