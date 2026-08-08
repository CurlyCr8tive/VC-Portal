// PR Kit Design Agent — Path A (Bulk Create CSV export).
//
// Per the Final PRD, Path B (Autofill API) is confirmed Enterprise-only and
// off the table on Tenyse's Teams plan — this file only ever needs to
// support Path A: a CSV that Tenyse uploads into Canva's Bulk Create herself.
//
// CANVA_COLUMN_MAP below is a PLACEHOLDER. The PRD is explicit about this:
// "Once the master Canva template is built, confirm the exact field
// names/labels with Tenyse before finalizing the CSV column mapping — a
// mismatch here breaks Bulk Create silently." Nobody has seen her real
// template's field names yet. When they're confirmed, update the
// `csvColumn` values below — nothing else in this file, or the UI that
// calls it, needs to change.
//
// Only CONFIRMED placements (a landed_date present) are eligible for
// export — a report of coverage shouldn't include stories that haven't
// actually run yet.

import { formatCurrency } from "../calculations.js";

export const CANVA_COLUMN_MAP = [
  { csvColumn: "Outlet_Name", field: "publication", required: true },
  { csvColumn: "Headline", field: "headline", required: true },
  { csvColumn: "Article_Link", field: "articleUrl", required: false },
  { csvColumn: "Publication_Date", field: "publicationDate", required: true },
  { csvColumn: "AVE_Value", field: "aveValue", required: true },
  { csvColumn: "Campaign_Name", field: "campaign", required: false },
];

function fieldValue(placement, field) {
  if (field === "aveValue") {
    return placement.aveValue != null ? formatCurrency(placement.aveValue) : "";
  }
  return placement[field] ?? "";
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

/**
 * Checks one placement against the required columns. Returns a list of
 * missing (human-readable) column names — empty list means it's exportable.
 */
export function validatePlacementForExport(placement) {
  return CANVA_COLUMN_MAP.filter((col) => col.required && isBlank(fieldValue(placement, col.field))).map((col) => col.csvColumn);
}

function escapeCsvValue(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(placements) {
  const header = CANVA_COLUMN_MAP.map((col) => col.csvColumn).join(",");
  const rows = placements.map((p) => CANVA_COLUMN_MAP.map((col) => escapeCsvValue(fieldValue(p, col.field))).join(","));
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
 * eligible placement is missing a required field, the whole export is
 * rejected with a clear per-placement, per-field list of what's missing,
 * per the PRD's failure-handling spec for this agent.
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
