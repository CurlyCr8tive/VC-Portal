// src/setUpAccountApp.js
//
// Client-side counterpart to owner-api's POST /api/clients/:clientId/invite
// route (see server/owner-api/index.js). That route calls Supabase Auth's
// inviteUserByEmail, which emails a link back to THIS page. This is the
// first page in the app that talks to Supabase directly from the browser
// (via the public anon key, window.SUPABASE_ANON_KEY in set-up-account.html)
// rather than going through owner-api/client-api.
//
// Locked rule this whole flow is built around: the owner never sees or
// handles a client's password. This page is the only place a password gets
// typed, and it goes straight from this form to Supabase — never through
// owner-api, never logged, never in a request Tenyse's side could read.

const errorEl = document.getElementById("setup-error");
const subEl = document.getElementById("setup-sub");
const form = document.getElementById("setup-form");
const submitBtn = document.getElementById("setup-submit");
const successPanel = document.getElementById("setup-success");

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.add("visible");
}

function clearError() {
  errorEl.textContent = "";
  errorEl.classList.remove("visible");
}

const SUPABASE_URL = window.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Honest "not wired up yet" state, same posture as the 503s elsewhere in
  // this build — this page is fully stylable/testable, it just can't talk
  // to a Supabase project that doesn't exist yet.
  subEl.textContent = "This page isn't connected to a real Supabase project yet — nothing to set up right now.";
  submitBtn.disabled = true;
  submitBtn.textContent = "Not connected yet";
} else {
  initSupabaseFlow();
}

async function initSupabaseFlow() {
  submitBtn.disabled = true;
  subEl.textContent = "Checking your invite link…";

  let supabase;
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    showError("Couldn't load the Supabase client library. Check your connection and reload this page.");
    return;
  }

  let sessionReady = false;

  supabase.auth.onAuthStateChange((event, session) => {
    if (session && !sessionReady) {
      sessionReady = true;
      subEl.textContent = "Choose a password to finish setting up your client portal login.";
      submitBtn.disabled = false;
    }
  });

  // detectSessionInUrl (on by default) parses the invite link's token
  // asynchronously on client creation — give it a few seconds before
  // concluding the link is bad, rather than failing instantly.
  setTimeout(() => {
    if (!sessionReady) {
      subEl.textContent = "";
      showError("This invite link is invalid or has expired. Ask the owner to resend your invite.");
    }
  }, 4000);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const password = document.getElementById("password").value;
    const confirm = document.getElementById("password-confirm").value;

    if (password.length < 8) {
      showError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      showError("Passwords don't match.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Saving…";

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Set Password & Continue";
      showError(error.message || "Couldn't save your password. Try again.");
      return;
    }

    form.style.display = "none";
    successPanel.style.display = "block";
  });
}
