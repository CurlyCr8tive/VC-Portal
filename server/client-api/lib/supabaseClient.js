// Real Supabase connection for client-api — same shape as owner-api's
// version on purpose (see that file's comments for why service-role +
// app-layer checks), but requireClient() here checks for role='pr_client'
// instead of 'owner', and every route handler additionally filters by
// req.profile.client_id — a pr_client session should never be able to pass
// a different client's id and get their data back.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

/**
 * Verifies the caller's Supabase Auth JWT and requires their profiles.role
 * to be 'pr_client'. Attaches the profile (including client_id) to
 * req.profile. Responds and returns false if the request should stop here.
 */
export async function requireClient(req, res) {
  if (!isSupabaseConfigured) {
    res.status(503).json({ error: "not_configured", message: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set." });
    return false;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "unauthorized", message: "Missing Authorization: Bearer <token> header." });
    return false;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired session." });
    return false;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, name, email, client_id")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile || profile.role !== "pr_client" || !profile.client_id) {
    res.status(403).json({ error: "forbidden", message: "This account is not a pr_client with an assigned client." });
    return false;
  }

  req.profile = profile;
  return true;
}
