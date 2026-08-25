// PR Kit Design Agent — Path A (Bulk Create CSV export).
//
// Per the Final PRD, Path B (Autofill API) is confirmed Enterprise-only and
// off the table on Tenyse's Teams plan — this file only ever needs to
// support Path A: a CSV that Tenyse uploads into Canva's Bulk Create herself.
//
// Column mapping now lives in canvaColumnMapping.js and is an inferred
// guess, not confirmed data — see that file's header comment. When her
// real template arrives, that file gets replaced; nothing here should need
// to change shape as a result.
//
// Only CONFIRMED placements (a landed_date present) are eligible for
// export — a report of coverage shouldn't include stories that haven't
// actually run yet.

import { formatCurrency } from "../calculations.js";
import { HIGH_CONFIDENCE_FIELDS, MEDIUM_CONFIDENCE_FIELDS, LOW_CONFIDENCE_FIELDS } from "./canvaColumnMapping.js";

const HIGH_CONFIDENCE_COLUMNS = Object.values(HIGH_CONFIDENCE_FIELDS);
// Medium + low confidence columns are handled identically: optional, and
// only included in a given export if at least one eligible placement
// actually has real data for them (see activeOptionalColumns below).
const OPTIONAL_COLUMNS = [...Object.values(MEDIUM_CONFIDENCE_FIELDS), ...Object.values(LOW_CONFIDENCE_FIELDS)];

const SUMMARY_COLUMN_LABEL = "Executive Summary";

function fieldValue(placement, schemaField) {
  if (schemaField === "aveValue") {
    return placement.aveValue != null ? formatCurrency(placement.aveValue) : "";
  }
  return placement[schemaField] ?? "";
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

/**
 * Checks one placement against the HIGH_CONFIDENCE_FIELDS' required
 * columns only — medium/low confidence fields are optional by design
 * (canvaColumnMapping.js) and never block an export on their own. Returns
 * human-readable labels of what's missing, empty list means exportable.
 */
export function validatePlacementForExport(placement) {
  return HIGH_CONFIDENCE_COLUMNS.filter((col) => col.required && isBlank(fieldValue(placement, col.schemaField))).map(
    (col) => col.guessedLabel
  );
}

/**
 * Which optional columns actually have real data in at least one of these
 * placements. canvaColumnMapping.js knowing a field exists in theory isn't
 * enough to earn it a column — several of its low-confidence fields
 * (socialLikes, audienceReach, etc.) aren't tracked anywhere in schema.js
 * yet, so this naturally excludes them until that changes. The rule is the
 * same either way: never generate a column of blank placeholders.
 */
function activeOptionalColumns(placements) {
  return OPTIONAL_COLUMNS.filter((col) => placements.some((p) => !isBlank(fieldValue(p, col.schemaField))));
}

function escapeCsvValue(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds row objects (not yet a CSV string) for a set of eligible
 * placements, optionally with an approved executive summary attached.
 *
 * IMPORTANT: only APPROVED summary text may reach this function — an
 * object with `text` but no `approvedAt` throws rather than being silently
 * included. That's a caller bug, not a normal failure state: a draft
 * sitting in the owner's editable field (per the AI Writing Functions rule,
 * "never sent or saved as final") must never leak into a client-facing
 * export. Passing `null` (no approved summary exists) is the normal,
 * expected case and just produces a warning, not a column.
 *
 * STRUCTURAL NOTE: Canva Bulk Create generates one design per CSV row, but
 * an executive summary is one-per-report while placements are many-per-
 * report. Until Tenyse's real template confirms otherwise, this repeats
 * the same summary text on every placement row (Option A) — the safest
 * default that works regardless of her actual page layout. Option B (one
 * row per client/period, placements concatenated into one cell) may be
 * more correct depending on her real design — revisit once it's known.
 */
export function buildCanvaExportRows(placements, approvedSummary = null) {
  const warnings = [];

  if (approvedSummary && !approvedSummary.approvedAt) {
    throw new Error(
      "buildCanvaExportRows received a summary without an approvedAt timestamp. " +
        "This is a bug in the caller, not a normal failure state — draft/unapproved " +
        "text must never reach a client-facing export."
    );
  }

  if (!approvedSummary) {
    warnings.push(
      "No approved executive summary for this period — export will proceed without one. " +
        "Generate and approve a summary first if the report should include one."
    );
  }

  const columns = [...HIGH_CONFIDENCE_COLUMNS, ...activeOptionalColumns(placements)];
  const columnLabels = columns.map((col) => col.guessedLabel);
  if (approvedSummary) columnLabels.push(SUMMARY_COLUMN_LABEL);

  const rows = placements.map((p) => {
    const row = {};
    for (const col of columns) {
      row[col.guessedLabel] = fieldValue(p, col.schemaField);
    }
    if (approvedSummary) {
      row[SUMMARY_COLUMN_LABEL] = approvedSummary.text;
    }
    return row;
  });

  return { rows, columnLabels, warnings };
}

function serializeRowsToCsv(rows, columnLabels) {
  const header = columnLabels.join(",");
  const csvRows = rows.map((row) => columnLabels.map((label) => escapeCsvValue(row[label])).join(","));
  return [header, ...csvRows].join("\r\n");
}

/**
 * No startDate/endDate given at all means "no date filter requested" — pass
 * everything through regardless of whether publicationDate is known. This
 * matters because several real seeded case-study placements (see
 * seedRealCaseStudyData.js) legitimately have no publicationDate — the
 * source material only gives a period/lifetime total, not a dated article
 * — while still being real, landed, exportable coverage. Requiring
 * publicationDate unconditionally would silently exclude every one of them
 * from Bulk Create even when the owner never asked to filter by date at
 * all. Once an actual bound IS given, a placement with no publicationDate
 * can't be proven to fall inside it, so it's excluded only in that case.
 */
function withinRange(dateStr, startDate, endDate) {
  if (!startDate && !endDate) return true;
  if (!dateStr) return false;
  if (startDate && dateStr < startDate) return false;
  if (endDate && dateStr > endDate) return false;
  return true;
}

/**
 * Builds the export. Never returns a partial/incomplete CSV — if any
 * eligible placement is missing a required (high-confidence) field, the
 * whole export is rejected with a clear per-placement, per-field list of
 * what's missing, per the PRD's failure-handling spec for this agent.
 *
 * `approvedSummary` is optional and, when present, must already be
 * approved (see buildCanvaExportRows) — the export proceeds either way;
 * missing a summary is a warning, not a blocker (owner's call, not this
 * function's).
 */
export function generateCanvaExport(allPlacements, { clientName, startDate, endDate, approvedSummary = null }) {
  const eligible = allPlacements.filter(
    (p) => p.client === clientName && p.landedDate && withinRange(p.publicationDate, startDate, endDate)
  );

  if (eligible.length === 0) {
    return { ok: false, reason: "no_placements", message: "No confirmed (landed) placements for this client in that date range." };
  }

  const issues = [];
  eligible.forEach((p, i) => {
    const missing = validatePlacementForExport(p);
    if (missing.length > 0) {
      issues.push({ placement: p.headline || `Row ${i + 1}`, missingColumns: missing });
    }
  });

  if (issues.length > 0) {
    return { ok: false, reason: "missing_fields", issues };
  }

  const { rows, columnLabels, warnings } = buildCanvaExportRows(eligible, approvedSummary);
  const csv = serializeRowsToCsv(rows, columnLabels);
  const safeClientName = clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const filename = `${safeClientName}-canva-export-${startDate || "all"}-to-${endDate || "all"}.csv`;
  return { ok: true, csv, filename, count: eligible.length, warnings };
}

/** Triggers a browser download of the generated CSV. */
export function downloadCsv(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
