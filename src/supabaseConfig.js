// src/supabaseConfig.js
//
// Single source of truth for the values every page needs to talk to
// Supabase directly from the browser (real Auth login, set-up-account.html's
// invite-completion flow). Loaded as a plain (non-module) script BEFORE any
// module script that needs window.SUPABASE_URL/SUPABASE_ANON_KEY, so it's
// just a global by the time those modules run.
//
// SUPABASE_URL is not secret — Supabase project URLs are meant to be
// public, same as the anon key below (protection comes from RLS, not
// secrecy; see db/schema.sql's policies). Never put the SERVICE_ROLE key
// here — that one stays server-side only (server/owner-api/.env), it
// bypasses RLS entirely.
window.SUPABASE_URL = "https://bjdzbyfxelshyxoswykk.supabase.co";

// Project Settings -> API -> "anon" / "public" key in the Supabase
// dashboard. Blank until filled in — every real-auth feature on this page
// degrades to an honest "not connected yet" state rather than a fake
// success when this is empty (see supabaseAuthClient.js).
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqZHpieWZ4ZWxzaHl4b3N3eWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNjY2OTgsImV4cCI6MjEwMjc0MjY5OH0.sWnxFjPTwgYx7h4xy685p3WS25lYSJTjvy--An_z_VM";

// Frontend -> API base URLs. Local defaults keep the demo/dev workflow simple.
// After deployment, replace these with the hosted owner/client API origins
// (for example, Render/Railway/Fly URLs). Vercel can host the static pages,
// but the two Express APIs still need reachable deployed API origins unless
// they are converted to serverless functions.
window.OWNER_API_BASE_URL = window.OWNER_API_BASE_URL || "http://localhost:4001";
window.CLIENT_API_BASE_URL = window.CLIENT_API_BASE_URL || "http://localhost:4002";
