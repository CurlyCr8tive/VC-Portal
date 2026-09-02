# Client Onboarding Workflow

This is the intended handoff flow for Verified Consulting client access.
Tenyse should not need to touch Supabase directly to add clients after setup.

## Owner Flow

1. Tenyse logs into the owner portal.
2. She clicks **+ New Client**.
3. She adds the client details in the portal.
4. The portal creates the `clients` row in Supabase automatically.
5. She clicks **Invite Client**.

## Client Flow

1. The client receives the invite email.
2. The client opens the invite link.
3. The client creates their own password.
4. The Supabase Auth trigger creates the matching `profiles` row automatically.
5. The client logs in and only sees their own portal.

## System Notes

- Supabase Auth owns login credentials and password setup.
- The owner never sees or sets a client's password.
- The owner portal sends invite metadata with `role = pr_client` and the matching `client_id`.
- The `on_auth_user_created` trigger turns that metadata into the required `profiles` row.
- Client API routes still enforce `role = pr_client` and filter every request by the logged-in user's `client_id`.

## Setup Dependency

This workflow requires the Auth-to-profile trigger migration to be installed:

```text
db/migrations/2026-08-31-auth-profile-trigger.sql
```

If client login succeeds in Supabase Auth but the app says no matching profile exists, re-check that this migration has been run in the Supabase SQL Editor.
