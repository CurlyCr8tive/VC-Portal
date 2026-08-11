// Real Supabase connection for owner-api — uses the SERVICE ROLE key, which
// bypasses RLS entirely. That's intentional: this Express service IS the
// trusted backend, and enforces "must be role=owner" itself in requireOwner()
// below, the same way db/schema.sql's comments describe ("enforce at the
// application layer"). RLS in db/schema.sql is the second, independent layer
// that still holds even if a route here has a bug — not the only layer.
//
// No project exists yet (per the PRD, must be created under Tenyse's own
// account/payment method, not the builder's) — so these env vars are unset
// in every environment right now. That's surfaced honestly via /health and
// via 503s below, not masked with fake data.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

/**
 * Verifies the caller's Supabase Auth JWT (sent as `Authorization: Bearer
 * <token>` by the frontend after Supabase Auth login) and requires their
 * profiles.role to be 'owner'. Attaches the profile to req.profile.
 * Responds and returns false if the request should stop here.
 */
export async function requireOwner(req, res) {
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

  if (profileError || !profile || profile.role !== "owner") {
    res.status(403).json({ error: "forbidden", message: "This account is not an owner." });
    return false;
  }

  req.profile = profile;
  return true;
}
