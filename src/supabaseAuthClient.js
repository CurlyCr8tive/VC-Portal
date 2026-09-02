// src/supabaseAuthClient.js
//
// Thin wrapper around the Supabase client-side JS SDK, using the anon key
// from src/supabaseConfig.js. This is REAL Supabase Auth — distinct from
// src/auth.js's mock login/session (see that file's own header for exactly
// what mock auth does and doesn't prove). A real session's access token is
// what makes the Authorization: Bearer <token> header on owner-api's
// requireOwner()-gated routes (invite, research-outlet-rate, etc.) actually
// pass instead of 401ing — mock auth alone can never do that, since
// owner-api verifies a real Supabase JWT, not this app's localStorage
// session shape.
//
// Session persistence and token refresh are handled entirely by the
// Supabase SDK itself (persistSession + autoRefreshToken, both on by
// default, storing under its own localStorage key) — this module doesn't
// duplicate that logic. One client instance is created lazily per page
// load and reused for every call on that page.

let clientPromise = null;

function getClient() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("https://esm.sh/@supabase/supabase-js@2").then(({ createClient }) =>
      createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    );
  }
  return clientPromise;
}

export function isRealAuthConfigured() {
  return Boolean(window.SUPABASE_URL && window.SUPABASE_ANON_KEY);
}

/**
 * Signs in with real Supabase Auth and, on success, reads the caller's own
 * `profiles` row (allowed by the "read own profile" RLS policy in
 * db/schema.sql) so the caller gets back a role/name/client_id shaped the
 * same way src/auth.js's mock accounts are — existing role-gating code
 * doesn't need to know or care which kind of session it's looking at.
 * Returns { ok: true, profile } or { ok: false, message }.
 */
export async function signInReal(email, password) {
  const supabase = await getClient();
  if (!supabase) {
    return { ok: false, message: "Real Supabase Auth isn't configured on this page (SUPABASE_ANON_KEY unset)." };
  }

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return { ok: false, message: signInError.message };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, name, email, client_id")
    .eq("id", signInData.user.id)
    .single();
  if (profileError || !profile) {
    // A real auth.users row with no matching profiles row means the
    // Auth -> profiles trigger was not installed when this user was created,
    // or the account metadata did not include a recognized app role.
    await supabase.auth.signOut();
    return { ok: false, message: "Signed in, but no matching profiles row exists for this account — can't determine a role." };
  }

  return { ok: true, profile };
}

/** Current real session's access token, or null if not signed in / not configured. */
export async function getAccessToken() {
  const supabase = await getClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function signOutReal() {
  const supabase = await getClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}
