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
  { email: "hello@vegandiningmonth.com", role: "pr_client", clientId: "vegan-dining-month", name: "VegansBaby — Vegan Dining Month" },
  { email: "hello@snapco.com", role: "pr_client", clientId: "snap-co", name: "SNAP Co." },
  { email: "hello@sunnysparkling.com", role: "pr_client", clientId: "sunny-sparkling", name: "Sunny Sparkling Co." },
  { email: "hello@greyzbistro.com", role: "pr_client", clientId: "greyz-bistro", name: "Greyz Bistro" },
];

export function login(email) {
  const account = MOCK_ACCOUNTS.find((a) => a.email.toLowerCase() === String(email || "").trim().toLowerCase());
  if (!account) return null;
  setSession(account);
  return account;
}

/**
 * Stores a session directly, bypassing the mock-account lookup — used by
 * the real-Supabase-Auth login path (src/supabaseAuthClient.js) once it's
 * confirmed a real account + profile, so the resulting session is shaped
 * exactly like a mock one and every existing requireSession()/role-gating
 * call site keeps working unchanged, real or mock.
 */
export function setSession(account) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(account));
}

const VALID_ROLES = new Set(["owner", "pr_client"]);

/**
 * The single point every other function reads a session through — so this
 * is also the single point that decides what counts as a valid session.
 * A parsed object with an unrecognized `role` (a legacy session shape from
 * an earlier build, a hand-edited localStorage value, anything that isn't
 * exactly "owner" or "pr_client") is treated as NOT logged in and cleared
 * immediately, rather than handed back and left for some later call site
 * to reject. Letting a bad role propagate through the app is exactly what
 * caused an infinite client.html<->login.html redirect loop — landingPageFor()
 * had no page to send an unrecognized role to that wasn't itself gated,
 * so the loop kept re-triggering no matter which page it bounced to. This
 * fixes it at the source instead of chasing every downstream symptom.
 */
export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  let session;
  try {
    session = JSON.parse(raw);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  if (!session || !VALID_ROLES.has(session.role)) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return session;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Maps a session to the page it belongs on. Explicit about every known
 * role rather than "owner, else client" — that fallback used to route any
 * unrecognized/corrupted role (a legacy session shape, a bad value typed
 * into localStorage by hand) straight to client.html, which would then
 * fail its OWN role check and call this function again, landing back on
 * client.html again — an infinite redirect loop with no visible error,
 * just a blank page that never finishes navigating. Now anything that
 * isn't a real known role safely falls back to login.html, which has no
 * further redirect of its own to loop into.
 */
export function landingPageFor(session) {
  if (!session) return "login.html";
  if (session.role === "owner") return "owner.html";
  if (session.role === "pr_client") return "client.html";
  return "login.html";
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
