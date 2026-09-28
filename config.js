// Runtime deploy config for the Verified Consulting PR platform.
//
// This file is intentionally safe to load in the browser. It may contain
// public Supabase anon values and public API origins, but never put
// SUPABASE_SERVICE_ROLE_KEY, Gmail secrets, OAuth refresh tokens, or any other
// server-only secret here.
//
// For local development these values can remain on localhost. Before sending a
// live invite, replace APP_BASE_URL, OWNER_API_BASE_URL, and CLIENT_API_BASE_URL
// with the deployed frontend/owner-api/client-api origins.
window.VC_PORTAL_CONFIG = {
  SUPABASE_URL: "https://bjdzbyfxelshyxoswykk.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqZHpieWZ4ZWxzaHl4b3N3eWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNjY2OTgsImV4cCI6MjEwMjc0MjY5OH0.sWnxFjPTwgYx7h4xy685p3WS25lYSJTjvy--An_z_VM",
  APP_BASE_URL: window.location.origin,
  OWNER_API_BASE_URL: "http://localhost:4001",
  CLIENT_API_BASE_URL: "http://localhost:4002",
};
