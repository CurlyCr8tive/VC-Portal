// Mock authentication — shared by login.html, client.html, and owner.html.
//
// This is NOT real auth. There is no password check, no server, no session
// token, nothing that couldn't be bypassed by typing directly into
// localStorage from devtools. It exists so the two portals can be gated
// behind *something* resembling a login/logout flow while a real backend
// doesn't exist yet. Do not treat `requireSession()` passing as proof that
// access control works — it only proves this browser's localStorage has an
// object shaped like a session in it.

const SESSION_KEY = "vc_session";

// Role naming matches the Final PRD's reserved schema field exactly:
// owner / pr_client / coaching_mentee. `coaching_mentee` has no accounts and
// no gated page yet — the 90-day coaching program is explicitly future
// scope (see PRD "Coaching Program — future scope, add"), not something to
// build now. It's named here only so the role field doesn't need a second
// rename later when that program actually starts.
export const MOCK_ACCOUNTS = [
  { email: "tenyse@verifiedconsulting.com", role: "owner", name: "Tenyse Williams" },
  { email: "hello@veganhood.com", role: "pr_client", clientId: "veganhood", name: "VeganHood" },
  { email: "hello@sunnysparkling.com", role: "pr_client", clientId: "sunny-sparkling", name: "Sunny Sparkling Co." },
];

export function login(email) {
  const account = MOCK_ACCOUNTS.find((a) => a.email.toLowerCase() === String(email || "").trim().toLowerCase());
  if (!account) return null;
  localStorage.setItem(SESSION_KEY, JSON.stringify(account));
  return account;
}

export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function landingPageFor(session) {
  if (!session) return "login.html";
  return session.role === "owner" ? "owner.html" : "client.html";
}

/**
 * Call at the top of a gated page. Redirects to login.html (or back to the
 * correct portal, if logged in as the wrong role) and returns null when the
 * page shouldn't render. Returns the session when it's safe to proceed.
 */
export function requireSession(expectedRole) {
  const session = getSession();
  if (!session || session.role !== expectedRole) {
    window.location.href = session ? landingPageFor(session) : "login.html";
    return null;
  }
  return session;
}
