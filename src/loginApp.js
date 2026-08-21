import { login, getSession, landingPageFor, setSession, MOCK_ACCOUNTS } from "./auth.js";
import { isRealAuthConfigured, signInReal } from "./supabaseAuthClient.js";

// Already logged in? Skip the form and go straight to the right dashboard.
const existing = getSession();
if (existing) {
  window.location.href = landingPageFor(existing);
}

// Real accounts bootstrapped directly in the temp Supabase project (see
// server/owner-api's admin scripts) — deliberately NOT paired with a
// password here, unlike the mock list below. That password is real, if
// low-stakes (temp/throwaway project, no real client data), and this file
// ships in a currently-public repo — ask for it out of band instead.
const REAL_DEMO_ACCOUNTS = [
  { email: "test-owner@verified-consulting-temp.local", label: "owner" },
  { email: "test-client@verified-consulting-temp.local", label: "client" },
];

if (isRealAuthConfigured()) {
  document.getElementById("real-accounts-wrap").style.display = "block";
  document.getElementById("real-account-list").innerHTML = REAL_DEMO_ACCOUNTS.map(
    (a) => `<li><button type="button" data-real-email="${a.email}">${a.email}</button> — ${a.label}</li>`
  ).join("");
  document.querySelectorAll("[data-real-email]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("email").value = btn.dataset.realEmail;
      document.getElementById("password").value = "";
      document.getElementById("password").focus();
    });
  });
}

const listEl = document.getElementById("demo-account-list");
listEl.innerHTML = MOCK_ACCOUNTS.map(
  (a) => `<li><button type="button" data-email="${a.email}">${a.email}</button> — ${a.role === "owner" ? "owner" : `client (${a.name})`}</li>`
).join("");

listEl.querySelectorAll("[data-email]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("email").value = btn.dataset.email;
    document.getElementById("password").value = "demo";
  });
});

const form = document.getElementById("login-form");
const errorEl = document.getElementById("auth-error");
const submitBtn = form.querySelector('button[type="submit"]');

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.classList.remove("visible");
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  // Real auth is tried first whenever it's configured — a mismatch here
  // (e.g. typing a mock demo email) is expected, not an error, so it just
  // falls through to the mock lookup below rather than surfacing yet.
  if (isRealAuthConfigured()) {
    submitBtn.disabled = true;
    const result = await signInReal(email, password);
    submitBtn.disabled = false;
    if (result.ok) {
      const account = {
        email: result.profile.email,
        role: result.profile.role,
        name: result.profile.name,
        clientId: result.profile.client_id,
        real: true,
      };
      setSession(account);
      window.location.href = landingPageFor(account);
      return;
    }
  }

  const account = login(email);
  if (!account) {
    errorEl.textContent = "No matching account for that email/password. Try one of the accounts listed below.";
    errorEl.classList.add("visible");
    return;
  }

  window.location.href = landingPageFor(account);
});
