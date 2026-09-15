const clientId = () => process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
const refreshToken = () => process.env.GOOGLE_REFRESH_TOKEN || process.env.GMAIL_REFRESH_TOKEN;

export const isGoogleWorkspaceConfigured = Boolean(clientId() && clientSecret() && refreshToken());

function requireGoogleWorkspace() {
  if (!isGoogleWorkspaceConfigured) {
    return {
      ok: false,
      message:
        "Google Workspace is not connected yet. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN with Gmail read, Gmail send, and Calendar event scopes.",
    };
  }
  return { ok: true };
}

async function getAccessToken() {
  const configured = requireGoogleWorkspace();
  if (!configured.ok) throw new Error(configured.message);

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
    throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

function compact(parts) {
  return parts.map((v) => String(v || "").trim()).filter(Boolean);
}

function buildPitchQuery({ clientName, publication, headline }) {
  return compact([
    clientName,
    publication,
    headline,
    "(pitch OR pitched OR reporter OR journalist OR interview OR coverage)",
  ]).join(" ");
}

function decodeBase64Url(data = "") {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function findHeader(headers = [], name) {
  return headers.find((h) => String(h.name || "").toLowerCase() === name.toLowerCase())?.value || "";
}

function snippetDate(message) {
  const date = findHeader(message.payload?.headers || [], "Date");
  const parsed = date ? new Date(date) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function messageBody(payload) {
  if (!payload) return "";
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  const parts = payload.parts || [];
  const plain = parts.find((part) => part.mimeType === "text/plain");
  if (plain?.body?.data) return decodeBase64Url(plain.body.data);
  return parts.map(messageBody).filter(Boolean).join("\n");
}

function pitchEvidenceScore({ queryParts, message }) {
  const haystack = `${message.subject || ""} ${message.snippet || ""} ${message.body || ""}`.toLowerCase();
  return queryParts.reduce((score, part) => {
    const clean = String(part || "").replace(/[()"']/g, "").trim().toLowerCase();
    if (!clean || clean.includes(" or ")) return score;
    return haystack.includes(clean) ? score + 1 : score;
  }, 0);
}

export async function searchGmailForPitchDate({ clientName, publication, headline }) {
  const configured = requireGoogleWorkspace();
  if (!configured.ok) return { available: false, message: configured.message };

  const accessToken = await getAccessToken();
  const query = buildPitchQuery({ clientName, publication, headline });
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("q", query);
  listUrl.searchParams.set("maxResults", "10");

  const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!listRes.ok) throw new Error(`Gmail search failed: ${listRes.status} ${await listRes.text()}`);
  const listBody = await listRes.json();
  const ids = (listBody.messages || []).map((m) => m.id);
  if (!ids.length) return { available: true, query, suggestedDate: "", messages: [] };

  const messages = await Promise.all(
    ids.map(async (id) => {
      const msgUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`);
      msgUrl.searchParams.set("format", "full");
      const res = await fetch(msgUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error(`Gmail message lookup failed: ${res.status} ${await res.text()}`);
      const msg = await res.json();
      const headers = msg.payload?.headers || [];
      return {
        id: msg.id,
        threadId: msg.threadId,
        date: snippetDate(msg),
        from: findHeader(headers, "From"),
        subject: findHeader(headers, "Subject"),
        snippet: msg.snippet || "",
        body: messageBody(msg.payload),
      };
    })
  );

  const queryParts = compact([clientName, publication, headline]);
  const ranked = messages
    .map((message) => ({ ...message, score: pitchEvidenceScore({ queryParts, message }) }))
    .sort((a, b) => b.score - a.score || String(b.date).localeCompare(String(a.date)));

  return {
    available: true,
    query,
    suggestedDate: ranked.find((m) => m.date)?.date || "",
    messages: ranked.slice(0, 5).map(({ body, ...safe }) => safe),
  };
}

export async function createCalendarEvent({ clientName, contactEmail, notes, startDate, startTime, durationMinutes = 30 }) {
  const configured = requireGoogleWorkspace();
  if (!configured.ok) return { available: false, message: configured.message };

  const date = startDate || new Date().toISOString().slice(0, 10);
  const time = startTime || "10:00";
  const start = new Date(`${date}T${time}:00`);
  if (Number.isNaN(start.getTime())) return { available: false, message: "Choose a valid meeting date and time." };
  const end = new Date(start.getTime() + Number(durationMinutes || 30) * 60 * 1000);

  const accessToken = await getAccessToken();
  const event = {
    summary: `Verified Consulting check-in${clientName ? ` - ${clientName}` : ""}`,
    description: compact([
      `Client: ${clientName || "Client"}`,
      notes && `Context: ${notes}`,
      "Agenda: review campaign status, open notes, upcoming opportunities, and follow-up dates.",
    ]).join("\n\n"),
    start: { dateTime: start.toISOString(), timeZone: process.env.GOOGLE_CALENDAR_TIME_ZONE || "America/New_York" },
    end: { dateTime: end.toISOString(), timeZone: process.env.GOOGLE_CALENDAR_TIME_ZONE || "America/New_York" },
    attendees: contactEmail ? [{ email: contactEmail }] : [],
  };

  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error(`Google Calendar event creation failed: ${res.status} ${await res.text()}`);
  const created = await res.json();
  return { available: true, eventId: created.id, htmlLink: created.htmlLink, summary: created.summary };
}
