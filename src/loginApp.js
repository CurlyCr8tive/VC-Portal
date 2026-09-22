import { demoLandingPageFor, login, landingPageFor, setSession, MOCK_ACCOUNTS } from "./auth.js?v=20260922-preview-switch";
import { isRealAuthConfigured, signInReal } from "./supabaseAuthClient.js";

// Keep login.html stable even when a previous owner/client demo session exists.
// Demo Day walkthroughs often switch roles; auto-redirecting away from the
// login screen made the page look broken before users could choose an account.

// Real Supabase accounts are deliberately NOT paired with passwords here,
// unlike the mock list below. The owner types the password created in
// Supabase Auth; the button only fills the email to avoid steering users
// toward stale temp accounts during a walkthrough.
const REAL_ACCOUNTS = [
  { email: "tenyse@verifiedconsulting.com", label: "owner" },
];

if (isRealAuthConfigured()) {
  document.getElementById("real-accounts-wrap").style.display = "block";
  document.getElementById("real-account-list").innerHTML = REAL_ACCOUNTS.map(
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
let selectedDemoEmail = "";

function selectDemoAccount(email) {
  selectedDemoEmail = email;
  document.getElementById("email").value = email;
  document.getElementById("password").value = "demo";
}

if (!listEl.children.length) {
  listEl.innerHTML = MOCK_ACCOUNTS.map(
    (a) => `<li><button type="button" data-email="${a.email}">${a.email}</button> — ${a.role === "owner" ? "owner" : `client (${a.name})`}</li>`
  ).join("");
}

listEl.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-email]");
  if (!btn) return;
  selectDemoAccount(btn.dataset.email);
});

const form = document.getElementById("login-form");
const errorEl = document.getElementById("auth-error");
const submitBtn = form.querySelector('button[type="submit"]');

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.classList.remove("visible");
  const email = document.getElementById("email").value.trim() || selectedDemoEmail;
  const password = document.getElementById("password").value;
  const mockAccount = MOCK_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase());

  // Real auth is tried first whenever it's configured — a mismatch here
  // (e.g. typing a mock demo email) is expected, not an error, so it just
  // falls through to the mock lookup below rather than surfacing yet.
  //
  // A known real account's email (e.g. Tenyse's) is deliberately ALSO in
  // MOCK_ACCOUNTS, so the "Open owner demo" walkthrough link keeps working.
  // That must not shadow her real sign-in: without this check, typing her
  // real password here would always match the mock account first and land
  // her back in preview mode no matter what she typed, silently, with no
  // error — exactly the bug this comment used to hide.
  const isKnownRealAccount = REAL_ACCOUNTS.some((a) => a.email.toLowerCase() === email.toLowerCase());
  if (isRealAuthConfigured() && (isKnownRealAccount || !mockAccount)) {
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
    // A known real account (Tenyse's) failing real auth must say so — it
    // must never silently fall through to the mock account below, which
    // would land her in preview mode with no indication her password was
    // wrong.
    if (isKnownRealAccount) {
      errorEl.textContent = result.message || "That password didn't match. Try again, or use the account reset link.";
      errorEl.classList.add("visible");
      return;
    }
  }

  const account = mockAccount || login(email);
  if (!account) {
    errorEl.textContent = "We couldn't find that account. Check the email, or use one of the demo preview links below.";
    errorEl.classList.add("visible");
    return;
  }

  window.location.href = account.real ? landingPageFor(account) : demoLandingPageFor(account);
});
