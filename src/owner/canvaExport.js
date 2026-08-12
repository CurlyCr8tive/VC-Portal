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

function buildCsv(placements) {
  const columns = [...HIGH_CONFIDENCE_COLUMNS, ...activeOptionalColumns(placements)];
  const header = columns.map((col) => col.guessedLabel).join(",");
  const rows = placements.map((p) => columns.map((col) => escapeCsvValue(fieldValue(p, col.schemaField))).join(","));
  return [header, ...rows].join("\r\n");
}

function withinRange(dateStr, startDate, endDate) {
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
 */
export function generateCanvaExport(allPlacements, { clientName, startDate, endDate }) {
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

  const csv = buildCsv(eligible);
  const safeClientName = clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const filename = `${safeClientName}-canva-export-${startDate || "all"}-to-${endDate || "all"}.csv`;
  return { ok: true, csv, filename, count: eligible.length };
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
