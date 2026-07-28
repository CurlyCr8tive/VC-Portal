import { login, getSession, landingPageFor, MOCK_ACCOUNTS } from "./auth.js";

// Already logged in? Skip the form and go straight to the right dashboard.
const existing = getSession();
if (existing) {
  window.location.href = landingPageFor(existing);
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

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const account = login(email);

  if (!account) {
    errorEl.textContent = "No matching demo account for that email. Try one of the accounts listed below.";
    errorEl.classList.add("visible");
    return;
  }

  window.location.href = landingPageFor(account);
});
