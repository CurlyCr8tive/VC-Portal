// src/reportProse.js
//
// Converts Markdown-flavoured report text into plain prose fit for a
// client-facing document.
//
// Why this is needed: the seeded executive summaries were hand-written in
// Markdown — "# VeganHood Press Coverage Executive Summary", "**Problem**",
// "**Results**" — and nothing downstream renders Markdown. The text sits in
// a plain textarea, is saved verbatim as the client-facing summary, and is
// exported into Canva. Tenyse's client opens a report and reads literal
// hash marks and asterisks around every heading.
//
// The prompts now ask for prose (server/owner-api/lib/prompts/outputFormat.js),
// which fixes everything generated from here on. This handles the text that
// was already written and, in several browsers, already approved.
//
// DELIBERATELY MECHANICAL. It changes punctuation and symbols, never words.
// These summaries describe real campaigns and several are approved — that
// is Tenyse's copy, and a formatting fix has no business rewriting her
// sentences. Anything this cannot handle is left exactly as it is rather
// than guessed at.

/**
 * True if the text still carries Markdown syntax worth cleaning.
 * Used to skip text that is already clean instead of rewriting it.
 */
export function hasMarkdownArtifacts(text) {
  if (!text) return false;
  return /^\s{0,3}#{1,6}\s|\*\*|__|^\s*[-*+•]\s|`/m.test(text);
}

/**
 * Strips Markdown syntax while preserving the content and its structure.
 *
 * - A leading "# Client — Report Title" line is dropped entirely: the
 *   document already carries its own title, and repeating it inside the
 *   body is what made these read like a raw file.
 * - "**Problem**" on its own line becomes "Problem:" — the label survives,
 *   because her case studies genuinely follow Problem / Solution / Results.
 *   Only the syntax goes.
 * - Inline **emphasis** loses its asterisks; the words stay.
 * - List markers are removed, leaving the item text on its own line.
 */
export function toReportProse(text) {
  if (!text) return text;
  const lines = String(text).replace(/\r\n/g, "\n").split("\n");
  const out = [];

  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i];

    // Drop a leading title heading — but only if it really is at the top,
    // so a mid-document heading isn't silently deleted along with it.
    if (out.every((l) => l.trim() === "") && /^\s{0,3}#{1,6}\s+/.test(line)) {
      continue;
    }

    // Any other heading keeps its words, as a label with a colon.
    line = line.replace(/^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/, (_m, body) =>
      /[.:!?]$/.test(body.trim()) ? body.trim() : `${body.trim()}:`
    );

    // A whole line that is just **Label** becomes "Label:".
    line = line.replace(/^\s*\*\*(.+?)\*\*\s*:?\s*$/, (_m, body) =>
      /[.:!?]$/.test(body.trim()) ? body.trim() : `${body.trim()}:`
    );

    // List markers: drop the bullet, keep the text.
    line = line.replace(/^(\s*)[-*+•]\s+/, "$1");
    line = line.replace(/^(\s*)\d+[.)]\s+/, "$1");

    // Remaining inline emphasis and code ticks.
    line = line.replace(/\*\*(.+?)\*\*/g, "$1");
    line = line.replace(/__(.+?)__/g, "$1");
    line = line.replace(/`([^`]+)`/g, "$1");

    // Horizontal rules carry no meaning once the symbols are gone.
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) continue;

    out.push(line);
  }

  // Collapse the runs of blank lines that dropping a title tends to leave,
  // and trim trailing whitespace per line without touching indentation.
  return out
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
