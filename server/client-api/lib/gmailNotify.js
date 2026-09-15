// Gmail notification — "notify the owner when a client posts a campaign
// note" (notesStorage.js flagged this as NOT built, needing real Gmail
// OAuth, "Required Access: Not yet raised"). This is that missing piece.
//
// Deliberately dependency-free (no googleapis package): a refresh-token
// exchange + a single REST call is all Gmail's API needs here, both done
// with the fetch() that's built into Node 18+. One fewer thing to audit.
//
// This CANNOT work without real credentials that only Tenyse (or whoever
// administers the sending Google account) can produce:
//   1. A Google Cloud project with the Gmail API enabled.
//   2. An OAuth consent screen + OAuth client (type: Desktop or Web).
//   3. A one-time authorization by the sending account, to get a refresh
//      token — this is a manual step (OAuth Playground or a short local
//      script), not something that can be generated in advance.
// Until Google OAuth credentials and a notify-to address are set,
// sendNoteNotification() logs a warning and no-ops — it does not throw, so
// a missing/misconfigured mailer never breaks the actual note-saving
// request that triggered it.

const clientId = () => process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const clientSecret = () => process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const refreshToken = () => process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN;
const notifyTo = () => process.env.GMAIL_NOTIFY_TO || process.env.GOOGLE_NOTIFY_TO || "tenyse@verifiedconsulting.com";

export const isGmailConfigured = Boolean(clientId() && clientSecret() && refreshToken() && notifyTo());

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId(),
      client_secret: clientSecret(),
      refresh_token: refreshToken(),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Gmail token refresh failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

function buildRawMessage({ to, subject, body }) {
  const message = [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n");
  // Gmail's API wants the RFC 2822 message base64url-encoded, not plain base64.
  return Buffer.from(message).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Fire-and-forget from the POST notes route: never throws, so a mailer
 * outage never blocks or fails the note itself from saving. Returns true/
 * false so the caller can log the outcome if it wants to.
 */
export async function sendNoteNotification({ clientName, campaignName, authorName, body }) {
  if (!isGmailConfigured) {
    console.warn("[gmailNotify] Skipped — Google OAuth env vars not set. See server/client-api/.env.example.");
    return false;
  }
  try {
    const accessToken = await getAccessToken();
    const raw = buildRawMessage({
      to: notifyTo(),
      subject: `New note on ${clientName} — ${campaignName}`,
      body: `${authorName} posted a new note on ${campaignName} (${clientName}):\n\n${body}`,
    });
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) throw new Error(`Gmail send failed: ${res.status} ${await res.text()}`);
    return true;
  } catch (err) {
    console.error("[gmailNotify] Failed to send notification:", err.message);
    return false;
  }
}
